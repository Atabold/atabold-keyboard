// Registers a device public key on the backend (spec 7.2): sets the function secret
// DEVICE_PUBLIC_KEY_SPKI and waits for Scaleway to redeploy. One device at a time: the new key
// replaces the previous one.
//
//   node tools/register-device.mjs <SPKI base64>   the phone key (Settings → Correction & privacy → Share)
//   node tools/register-device.mjs --dev           the PC development key, e.g. to run eval/run.mjs
//
// Needs the Scaleway CLI configured (docs/guides/getting-started.md) and KB_FUNCTION_ID set to the id of
// your function (`scw function function list`, the ID column). SCW_CLI overrides the command name
// (default: scaleway-cli on Windows, the winget alias, and scw elsewhere).
import { execFileSync } from 'node:child_process';
import { createHash, createPublicKey } from 'node:crypto';
import { loadDevKey, publicKeyInfo } from './signing.mjs';

const FUNCTION_ID = process.env.KB_FUNCTION_ID;
const SCW = process.env.SCW_CLI ?? (process.platform === 'win32' ? 'scaleway-cli' : 'scw');
const POLL_MS = 2_000;
const MAX_POLLS = 90;

const arg = process.argv[2];
if (!arg) {
  console.log('usage: node tools/register-device.mjs <SPKI base64> | --dev');
  process.exit(1);
}
if (!FUNCTION_ID) {
  console.error('Set KB_FUNCTION_ID to the id of your function (scw function function list, the ID column).');
  process.exit(1);
}
const spkiB64 = arg === '--dev' ? publicKeyInfo(loadDevKey()).spkiB64 : arg.trim();

const der = Buffer.from(spkiB64, 'base64');
let key;
try {
  key = createPublicKey({ key: der, format: 'der', type: 'spki' });
} catch {
  console.error('Not a valid public key (expected base64 DER SubjectPublicKeyInfo).');
  process.exit(1);
}
if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails.namedCurve !== 'prime256v1') {
  console.error('Not an EC P-256 key.');
  process.exit(1);
}
const keyId = createHash('sha256').update(der).digest('hex').slice(0, 16);
console.log(`Registering key id ${keyId.match(/.{4}/g).join(' ')}: it must match the one shown in the app.`);

const scw = (...args) => JSON.parse(execFileSync(SCW, [...args, '-o', 'json'], { encoding: 'utf8' }));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

scw(
  'function', 'function', 'update', FUNCTION_ID,
  'secret-environment-variables.0.key=DEVICE_PUBLIC_KEY_SPKI',
  `secret-environment-variables.0.value=${spkiB64}`,
);
// Updating a secret does not restart the running instance: redeploy explicitly. deploy answers
// "pending" right away, and the function is back to "ready" about a minute later.
scw('function', 'function', 'deploy', FUNCTION_ID);

for (let i = 0; i < MAX_POLLS; i++) {
  await sleep(POLL_MS);
  const { status, error_message } = scw('function', 'function', 'get', FUNCTION_ID);
  if (status === 'error') {
    console.error(`Redeploy failed: ${error_message}`);
    process.exit(1);
  }
  if (status === 'ready') {
    console.log('Done: the backend now accepts only this key. Tap "Test connection" in the app.');
    process.exit(0);
  }
}
console.error('Still not ready after 3 minutes: check the function in the Scaleway console.');
process.exit(1);
