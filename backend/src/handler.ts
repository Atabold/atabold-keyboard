import { sendAlert } from './alerts.js';
import { authenticate } from './auth.js';
import { config } from './config.js';
import { takeRequestSlot } from './limits.js';
import { runAction } from './mistral.js';
import { parseRequest, type KbResponse } from './schema.js';

// Scaleway Serverless Functions HTTP event and response (Node runtime).
export type ScwEvent = {
  httpMethod: string;
  path: string;
  headers?: Record<string, unknown> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
};
export type ScwResponse = { statusCode: number; headers?: Record<string, string>; body: string };

const MAX_BODY_BYTES = 16 * 1024;

const ERROR_STATUS = {
  invalid_request: 400,
  unauthorized: 401,
  too_large: 413,
  rate_limited: 429,
  daily_cap: 429,
  provider_limit: 429,
  upstream_error: 502,
  upstream_timeout: 504,
} as const;
type ErrorCode = keyof typeof ERROR_STATUS;

type Outcome = { status: number; body?: KbResponse | { error: ErrorCode }; chars?: number };

const fail = (error: ErrorCode, chars?: number): Outcome => ({ status: ERROR_STATUS[error], body: { error }, chars });

export async function handle(event: ScwEvent): Promise<ScwResponse> {
  if (event.httpMethod !== 'POST' || (event.path !== '/v1/kb' && event.path !== '/v1/ping')) {
    return { statusCode: 404, body: '' };
  }
  const started = Date.now();
  const outcome = await processRequest(event);
  // Metadata only: never bodies, text or model output (SPEC 7.6).
  console.log(
    JSON.stringify({
      event: 'request',
      path: event.path,
      status: outcome.status,
      error: outcome.body && 'error' in outcome.body ? outcome.body.error : undefined,
      ms: Date.now() - started,
      chars: outcome.chars,
    }),
  );
  if (!outcome.body) return { statusCode: outcome.status, body: '' };
  return {
    statusCode: outcome.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(outcome.body),
  };
}

async function processRequest(event: ScwEvent): Promise<Outcome> {
  // The signature covers the body exactly as received, never a re-serialized JSON (SPEC 7.2).
  const body = Buffer.from(event.body ?? '', event.isBase64Encoded ? 'base64' : 'utf8');

  const auth = authenticate(event.httpMethod, event.path, lowercaseKeys(event.headers), body);
  if (auth !== 'ok') {
    await sendAlert(auth);
    return fail('unauthorized');
  }
  if (event.path === '/v1/ping') return { status: 204 };

  const slot = takeRequestSlot();
  if (slot !== 'ok') {
    if (slot === 'daily_cap') await sendAlert('daily_cap');
    return fail(slot);
  }

  if (body.length > MAX_BODY_BYTES) return fail('too_large');
  let json: unknown;
  try {
    json = JSON.parse(body.toString('utf8'));
  } catch {
    return fail('invalid_request');
  }
  const parsed = parseRequest(json, config.maxChars);
  if (!parsed.ok) return fail(parsed.error);

  const chars = parsed.request.text.length;
  const outcome = await runAction(parsed.request);
  if (!outcome.ok) {
    if (outcome.error === 'provider_limit') await sendAlert('provider_limit');
    return fail(outcome.error, chars);
  }
  return { status: 200, body: outcome.response, chars };
}

// Scaleway may deliver header names in any case (it injects e.g. "X-Forwarded-For").
function lowercaseKeys(headers: ScwEvent['headers']): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (typeof value === 'string') result[name.toLowerCase()] = value;
  }
  return result;
}
