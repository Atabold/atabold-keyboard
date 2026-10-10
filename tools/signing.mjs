// Signs requests with the development key exactly like the phone does (SPEC 7.2).
import { createHash, createPrivateKey, createPublicKey, randomBytes, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const DEV_KEY_PATH = new URL('./.dev-key.pem', import.meta.url);

export function loadDevKey() {
  return createPrivateKey(readFileSync(DEV_KEY_PATH));
}

export function publicKeyInfo(privateKey) {
  const spki = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
  return { spkiB64: spki.toString('base64'), keyId: createHash('sha256').update(spki).digest('hex').slice(0, 16) };
}

export async function signedPost(baseUrl, path, body, privateKey) {
  const bytes = Buffer.from(body, 'utf8');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(16).toString('base64url');
  const bodyHash = createHash('sha256').update(bytes).digest('hex');
  const data = `v1\nPOST\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = sign('sha256', Buffer.from(data), { key: privateKey, dsaEncoding: 'der' });

  return fetch(baseUrl.replace(/\/$/, '') + path, {
    method: 'POST',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      'X-KB-Key-Id': publicKeyInfo(privateKey).keyId,
      'X-KB-Timestamp': timestamp,
      'X-KB-Nonce': nonce,
      'X-KB-Signature': signature.toString('base64'),
    },
    body: bytes,
  });
}
