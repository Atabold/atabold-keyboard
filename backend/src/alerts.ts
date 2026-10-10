import { config } from './config.js';

const DEDUPE_MS = 15 * 60_000;
const TELEGRAM_TIMEOUT_MS = 3_000;

// Fixed texts: an alert never carries user text (SPEC 7.6).
const MESSAGES = {
  unauthorized: 'Keyboard: request from an unregistered device',
  replay: 'Keyboard: possible repeated request (replay)',
  daily_cap: 'Keyboard: daily limit reached',
  provider_limit: 'Keyboard: Mistral limit reached. If you did not expect it, revoke the key',
} as const;

export type AlertType = keyof typeof MESSAGES;

const lastSent = new Map<AlertType, number>();

export async function sendAlert(type: AlertType, now = Date.now()): Promise<void> {
  const { token, chatId } = config.telegram;
  if (!token || !chatId) return;
  const last = lastSent.get(type);
  if (last !== undefined && now - last < DEDUPE_MS) return;
  lastSent.set(type, now);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: MESSAGES[type] }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });
    if (!res.ok) console.log(JSON.stringify({ event: 'alert_failed', type, status: res.status }));
  } catch {
    // A failed alert must never change the response to the device.
    console.log(JSON.stringify({ event: 'alert_failed', type }));
  }
}
