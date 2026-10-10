// Development CLI for the backend (milestone M0): a development key and signed test requests.
//
//   node tools/kb.mjs keygen                               create tools/.dev-key.pem, print the public key
//   node tools/kb.mjs pubkey                               print the public key again
//   node tools/kb.mjs ping <base-url>                      signed /v1/ping
//   node tools/kb.mjs kb <base-url> <action> <text> [profile]
//
// The printed SPKI goes into the function secret DEVICE_PUBLIC_KEY_SPKI (SPEC 7.2).
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { DEV_KEY_PATH, loadDevKey, publicKeyInfo, signedPost } from './signing.mjs';

const [command, baseUrl, ...rest] = process.argv.slice(2);

function printPublicKey(privateKey) {
  const { spkiB64, keyId } = publicKeyInfo(privateKey);
  console.log(`DEVICE_PUBLIC_KEY_SPKI=${spkiB64}\nkey id: ${keyId}`);
}

async function send(path, body) {
  const started = Date.now();
  const res = await signedPost(baseUrl, path, body, loadDevKey());
  const text = await res.text();
  console.log(`${res.status} in ${Date.now() - started} ms`);
  if (text) console.log(text);
}

switch (command) {
  case 'keygen': {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    // flag 'wx': never overwrite an existing key by accident.
    writeFileSync(DEV_KEY_PATH, privateKey.export({ format: 'pem', type: 'pkcs8' }), { flag: 'wx', mode: 0o600 });
    printPublicKey(privateKey);
    break;
  }
  case 'pubkey':
    printPublicKey(loadDevKey());
    break;
  case 'ping':
    await send('/v1/ping', '');
    break;
  case 'kb': {
    const [action, text, profile = 'fast'] = rest;
    await send('/v1/kb', JSON.stringify({ action, text, options: { profile } }));
    break;
  }
  default:
    console.log('usage: node tools/kb.mjs keygen | pubkey | ping <base-url> | kb <base-url> <action> <text> [profile]');
    process.exitCode = 1;
}
