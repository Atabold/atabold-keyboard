import { config } from './config.js';

// In memory only: counters reset on cold start (SPEC 7.0). The hard cost cap is the Mistral workspace limit.
const lastMinute: number[] = [];
let day = '';
let dayCount = 0;

export type LimitResult = 'ok' | 'rate_limited' | 'daily_cap';

// Counts one /v1/kb request. /v1/ping never calls this (SPEC 5.8).
export function takeRequestSlot(now = Date.now()): LimitResult {
  while (lastMinute.length > 0 && lastMinute[0] <= now - 60_000) lastMinute.shift();
  const today = new Date(now).toISOString().slice(0, 10); // UTC day
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  if (dayCount >= config.dailyCap) return 'daily_cap';
  if (lastMinute.length >= config.ratePerMinute) return 'rate_limited';
  lastMinute.push(now);
  dayCount++;
  return 'ok';
}
