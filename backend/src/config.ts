import { createHash, createPublicKey, type KeyObject } from 'node:crypto';

const env = process.env;

function loadDevice(): { key: KeyObject; keyId: string } | null {
  if (!env.DEVICE_PUBLIC_KEY_SPKI) return null;
  const der = Buffer.from(env.DEVICE_PUBLIC_KEY_SPKI, 'base64');
  return {
    key: createPublicKey({ key: der, format: 'der', type: 'spki' }),
    keyId: createHash('sha256').update(der).digest('hex').slice(0, 16),
  };
}

export const config = {
  device: loadDevice(),
  mistralApiKey: env.MISTRAL_API_KEY ?? '',
  models: {
    fast: env.MODEL_FAST ?? 'mistral-small-latest',
    accurate: env.MODEL_ACCURATE ?? 'mistral-medium-latest',
  },
  ratePerMinute: Number(env.RATE_PER_MINUTE ?? 20),
  dailyCap: Number(env.DAILY_CAP ?? 300),
  maxChars: Number(env.MAX_CHARS ?? 4000),
  telegram: { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID },
};
