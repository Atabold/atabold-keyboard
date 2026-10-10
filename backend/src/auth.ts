import { createHash, verify, type KeyObject } from 'node:crypto';
import { config } from './config.js';

const TIMESTAMP_WINDOW_S = 30;
const NONCE_TTL_MS = 60_000;
const TIMESTAMP_RE = /^\d{1,12}$/;
const NONCE_RE = /^[A-Za-z0-9_-]{22}$/; // 16 random bytes, base64url without padding

// nonce -> expiry (ms). In memory only: it resets on cold start (SPEC 7.0).
const seenNonces = new Map<string, number>();

export type AuthResult = 'ok' | 'unauthorized' | 'replay';

// SPEC 7.2. The signature is checked before timestamp and nonce, which it covers:
// that way "replay" is only reported for requests the registered device really signed.
export function authenticate(
  method: string,
  path: string,
  headers: Record<string, string>,
  body: Buffer,
  now = Date.now(),
): AuthResult {
  const device = config.device;
  const timestamp = headers['x-kb-timestamp'] ?? '';
  const nonce = headers['x-kb-nonce'] ?? '';
  const signature = headers['x-kb-signature'] ?? '';
  if (
    !device ||
    headers['x-kb-key-id'] !== device.keyId ||
    !TIMESTAMP_RE.test(timestamp) ||
    !NONCE_RE.test(nonce) ||
    !signature
  ) {
    return 'unauthorized';
  }

  const bodyHash = createHash('sha256').update(body).digest('hex');
  const signed = `v1\n${method}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
  if (!verifySignature(device.key, signed, signature)) return 'unauthorized';

  if (Math.abs(now / 1000 - Number(timestamp)) > TIMESTAMP_WINDOW_S) return 'replay';
  for (const [seen, expiry] of seenNonces) {
    if (expiry <= now) seenNonces.delete(seen);
  }
  if (seenNonces.has(nonce)) return 'replay';
  seenNonces.set(nonce, now + NONCE_TTL_MS);
  return 'ok';
}

function verifySignature(key: KeyObject, data: string, signatureB64: string): boolean {
  try {
    return verify('sha256', Buffer.from(data), { key, dsaEncoding: 'der' }, Buffer.from(signatureB64, 'base64'));
  } catch {
    return false; // malformed DER from an untrusted caller
  }
}
