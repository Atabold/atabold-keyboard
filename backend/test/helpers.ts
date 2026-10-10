import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';
import type { ScwEvent } from '../src/handler.js';

export type Device = { privateKey: KeyObject; spkiB64: string; keyId: string };

export function makeDevice(): Device {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const spki = publicKey.export({ format: 'der', type: 'spki' });
  return {
    privateKey,
    spkiB64: spki.toString('base64'),
    keyId: createHash('sha256').update(spki).digest('hex').slice(0, 16),
  };
}

// Builds a request the way the phone does (SPEC 7.2). Header names use mixed case on purpose.
export function signedEvent(
  device: Device,
  {
    path = '/v1/kb',
    body = '',
    base64 = false,
    timestamp = Math.floor(Date.now() / 1000),
    nonce = randomBytes(16).toString('base64url'),
    signingKey = device.privateKey,
  }: {
    path?: string;
    body?: string;
    base64?: boolean;
    timestamp?: number;
    nonce?: string;
    signingKey?: KeyObject;
  } = {},
): ScwEvent {
  const bytes = Buffer.from(body, 'utf8');
  const bodyHash = createHash('sha256').update(bytes).digest('hex');
  const data = `v1\nPOST\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = sign('sha256', Buffer.from(data), { key: signingKey, dsaEncoding: 'der' });
  return {
    httpMethod: 'POST',
    path,
    headers: {
      'Content-Type': 'application/json',
      'X-KB-Key-Id': device.keyId,
      'X-Kb-Timestamp': String(timestamp),
      'x-kb-nonce': nonce,
      'X-KB-Signature': signature.toString('base64'),
    },
    body: base64 ? bytes.toString('base64') : body,
    isBase64Encoded: base64,
  };
}

export function kbBody(text: string, options: Record<string, unknown> = {}, action = 'correct'): string {
  return JSON.stringify({ action, text, options });
}

export function mistralReply(output: unknown, status = 200): Response {
  const content = typeof output === 'string' ? output : JSON.stringify(output);
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}
