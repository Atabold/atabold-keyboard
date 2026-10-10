import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScwEvent, ScwResponse } from '../src/handler.js';
import { kbBody, makeDevice, mistralReply, signedEvent, type Device } from './helpers.js';

const TEXT = 'Je suis allé à la université hier';
const OUTPUT = {
  result: "Je suis allé à l'université hier",
  detected_lang: 'fr',
  edits: [{ from: 'à la université', to: "à l'université", category: 'elision', explanation: 'Elision.' }],
  notes: [],
};

let handle: (event: ScwEvent) => Promise<ScwResponse>;
let device: Device;
let mistral: (init: RequestInit) => Response | Promise<Response>;
const fetchMock = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
  if (String(url).startsWith('https://api.mistral.ai/')) return mistral(init);
  if (String(url).startsWith('https://api.telegram.org/')) return new Response('{}');
  throw new Error(`unexpected fetch ${url}`);
});

const calls = (host: string) => fetchMock.mock.calls.filter(([url]) => String(url).startsWith(host));
const mistralCalls = () => calls('https://api.mistral.ai/');
const alerts = () => calls('https://api.telegram.org/').map(([, init]) => JSON.parse(String(init?.body)).text as string);
const mistralPayload = (i = 0) => JSON.parse(String(mistralCalls()[i][1]?.body));

async function kb(body: string, extra: Parameters<typeof signedEvent>[1] = {}) {
  return handle(signedEvent(device, { body, ...extra }));
}

beforeEach(async () => {
  vi.resetModules();
  fetchMock.mockClear();
  device = makeDevice();
  mistral = () => mistralReply(OUTPUT);
  vi.stubEnv('DEVICE_PUBLIC_KEY_SPKI', device.spkiB64);
  vi.stubEnv('MISTRAL_API_KEY', 'test-key');
  vi.stubEnv('MODEL_FAST', 'model-fast');
  vi.stubEnv('MODEL_ACCURATE', 'model-accurate');
  vi.stubEnv('RATE_PER_MINUTE', '3');
  vi.stubEnv('DAILY_CAP', '5');
  vi.stubEnv('MAX_CHARS', '100');
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'tg-token');
  vi.stubEnv('TELEGRAM_CHAT_ID', '42');
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  ({ handle } = await import('../src/handler.js'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('routing', () => {
  it('answers 404 with no body outside the two endpoints', async () => {
    for (const event of [
      { httpMethod: 'GET', path: '/v1/kb' },
      { httpMethod: 'POST', path: '/v1/other' },
      { httpMethod: 'POST', path: '/' },
    ]) {
      expect(await handle(event)).toEqual({ statusCode: 404, body: '' });
    }
  });

  it('answers a signed ping with 204 and no body, without calling the model', async () => {
    const res = await handle(signedEvent(device, { path: '/v1/ping' }));
    expect(res).toEqual({ statusCode: 204, body: '' });
    expect(mistralCalls()).toHaveLength(0);
  });

  it('returns the corrected text for a signed request', async () => {
    const res = await kb(kbBody(TEXT));
    expect(res.statusCode).toBe(200);
    expect(res.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(res.body)).toEqual(OUTPUT);
  });
});

describe('authentication', () => {
  it('accepts a DER signature over the body exactly as received, even base64-encoded', async () => {
    const body = `{ "action" : "correct",\n  "text": ${JSON.stringify(TEXT)} }`; // not canonical JSON
    expect((await kb(body)).statusCode).toBe(200);
    expect((await kb(body, { base64: true })).statusCode).toBe(200);
  });

  it('rejects a body changed after signing', async () => {
    const event = signedEvent(device, { body: kbBody(TEXT) });
    event.body = kbBody(`${TEXT}!`);
    expect((await handle(event)).statusCode).toBe(401);
  });

  it('rejects a signature made by another key', async () => {
    const other = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey;
    const res = await kb(kbBody(TEXT), { signingKey: other });
    expect(res).toMatchObject({ statusCode: 401, body: '{"error":"unauthorized"}' });
    expect(alerts()).toEqual(['Keyboard: request from an unregistered device']);
  });

  it('rejects an unknown key id, a malformed signature and missing headers', async () => {
    const unknownKey = signedEvent(makeDevice(), { body: kbBody(TEXT) });
    const garbage = signedEvent(device, { body: kbBody(TEXT) });
    garbage.headers!['X-KB-Signature'] = 'bm90LWEtc2lnbmF0dXJl';
    const unsigned = { httpMethod: 'POST', path: '/v1/kb', headers: {}, body: kbBody(TEXT) };
    for (const event of [unknownKey, garbage, unsigned]) {
      expect((await handle(event)).statusCode).toBe(401);
    }
    expect(mistralCalls()).toHaveLength(0);
  });

  it('rejects everything when no device is registered', async () => {
    vi.stubEnv('DEVICE_PUBLIC_KEY_SPKI', '');
    vi.resetModules();
    ({ handle } = await import('../src/handler.js'));
    expect((await handle(signedEvent(device, { path: '/v1/ping' }))).statusCode).toBe(401);
  });

  it('rejects a timestamp outside ±30 s as a replay', async () => {
    const res = await kb(kbBody(TEXT), { timestamp: Math.floor(Date.now() / 1000) - 31 });
    expect(res.statusCode).toBe(401);
    expect(alerts()).toEqual(['Keyboard: possible repeated request (replay)']);
  });

  it('rejects a reused nonce as a replay', async () => {
    const event = signedEvent(device, { body: kbBody(TEXT) });
    expect((await handle(event)).statusCode).toBe(200);
    expect((await handle(event)).statusCode).toBe(401);
    expect(alerts()).toEqual(['Keyboard: possible repeated request (replay)']);
  });
});

describe('request validation', () => {
  it.each([
    ['invalid JSON', '{"action":'],
    ['a JSON array', '[]'],
    ['an unknown action', kbBody(TEXT, {}, 'summarize')],
    ['an empty text', kbBody('   ')],
    ['an unknown top-level field', JSON.stringify({ action: 'correct', text: TEXT, client: { app_version: '0.1.0' } })],
    ['an unknown option', kbBody(TEXT, { model: 'mistral-large-latest' })],
    ['an inherited property name as option', kbBody(TEXT, { toString: 'x' })],
    ['an option value outside the enum', kbBody(TEXT, { explain_in: 'pt' })],
  ])('rejects %s with 400', async (_, body) => {
    expect(await kb(body)).toMatchObject({ statusCode: 400, body: '{"error":"invalid_request"}' });
    expect(mistralCalls()).toHaveLength(0);
  });

  it('rejects a text over MAX_CHARS with 413', async () => {
    expect(await kb(kbBody('a'.repeat(101)))).toMatchObject({ statusCode: 413, body: '{"error":"too_large"}' });
  });

  it('rejects a body over 16 KB with 413, even with a short text', async () => {
    const body = kbBody(TEXT).replace('{', `{${' '.repeat(16 * 1024)}`);
    expect((await kb(body)).statusCode).toBe(413);
  });

  it('fills omitted options with the settings defaults and sends only the ones the prompt reads', async () => {
    await kb(JSON.stringify({ action: 'correct', text: TEXT }));
    const payload = mistralPayload();
    expect(payload.model).toBe('model-fast');
    expect(JSON.parse(payload.messages[1].content)).toEqual({
      TEXT,
      OPTIONS: {
        explain_in: 'en',
        target_lang: 'auto',
        translate_foreign: true,
        register: 'auto',
        detail: 'short',
        harmonize_variant: false,
      },
    });
  });

  it('accepts the five languages for explain_in and translate_to, and no other', async () => {
    const { parseRequest } = await import('../src/schema.js');
    for (const lang of ['en', 'fr', 'de', 'es', 'it']) {
      const options = { explain_in: lang, translate_to: lang };
      expect(parseRequest({ action: 'translate', text: TEXT, options }, 100).ok).toBe(true);
    }
    expect(parseRequest({ action: 'correct', text: TEXT, options: { explain_in: 'pt' } }, 100).ok).toBe(false);
    expect(parseRequest({ action: 'translate', text: TEXT, options: { translate_to: 'pt' } }, 100).ok).toBe(false);
  });

  it('accepts harmonize_variant as a boolean only', async () => {
    await kb(kbBody(TEXT, { harmonize_variant: true }));
    expect(JSON.parse(mistralPayload().messages[1].content).OPTIONS.harmonize_variant).toBe(true);
    expect((await kb(kbBody(TEXT, { harmonize_variant: 'yes' }))).statusCode).toBe(400);
  });

  it('maps the accurate profile to its model on the server', async () => {
    await kb(kbBody(TEXT, { profile: 'accurate' }));
    expect(mistralPayload().model).toBe('model-accurate');
  });
});

describe('limits', () => {
  it('allows RATE_PER_MINUTE requests per minute, and pings do not count', async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 3; i++) expect((await kb(kbBody(TEXT))).statusCode).toBe(200);
    expect(await kb(kbBody(TEXT))).toMatchObject({ statusCode: 429, body: '{"error":"rate_limited"}' });
    expect((await handle(signedEvent(device, { path: '/v1/ping' }))).statusCode).toBe(204);
    vi.advanceTimersByTime(61_000);
    expect((await kb(kbBody(TEXT))).statusCode).toBe(200);
  });

  it('stops at DAILY_CAP with an alert, and resets on the next UTC day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    for (let i = 0; i < 5; i++) {
      expect((await kb(kbBody(TEXT))).statusCode).toBe(200);
      vi.advanceTimersByTime(30_000);
    }
    expect(await kb(kbBody(TEXT))).toMatchObject({ statusCode: 429, body: '{"error":"daily_cap"}' });
    expect(alerts()).toEqual(['Keyboard: daily limit reached']);
    for (let i = 0; i < 5; i++) expect((await handle(signedEvent(device, { path: '/v1/ping' }))).statusCode).toBe(204);

    vi.setSystemTime(new Date('2026-01-02T00:00:01Z'));
    expect((await kb(kbBody(TEXT))).statusCode).toBe(200);
  });
});

describe('model call', () => {
  it('maps a Mistral 429 to provider_limit and alerts', async () => {
    mistral = () => new Response('{}', { status: 429 });
    expect(await kb(kbBody(TEXT))).toMatchObject({ statusCode: 429, body: '{"error":"provider_limit"}' });
    expect(alerts()).toEqual(['Keyboard: Mistral limit reached. If you did not expect it, revoke the key']);
  });

  it('maps other Mistral errors to 502 without retrying', async () => {
    mistral = () => new Response('{}', { status: 500 });
    expect(await kb(kbBody(TEXT))).toMatchObject({ statusCode: 502, body: '{"error":"upstream_error"}' });
    expect(mistralCalls()).toHaveLength(1);
  });

  it('retries once on invalid output, then answers 502', async () => {
    mistral = () => mistralReply('not json');
    expect((await kb(kbBody(TEXT))).statusCode).toBe(502);
    expect(mistralCalls()).toHaveLength(2);
  });

  it('uses the retry when it returns valid output', async () => {
    const replies = [mistralReply({ result: '', detected_lang: 'fr', edits: [] }), mistralReply(OUTPUT)];
    mistral = () => replies.shift()!;
    expect((await kb(kbBody(TEXT))).statusCode).toBe(200);
    expect(mistralCalls()).toHaveLength(2);
  });

  it('treats a result longer than 3x the input + 200 as invalid', async () => {
    mistral = () => mistralReply({ ...OUTPUT, result: 'x'.repeat(3 * TEXT.length + 201) });
    expect((await kb(kbBody(TEXT))).statusCode).toBe(502);
  });

  it('maps an unknown category to vocabulary', async () => {
    mistral = () => mistralReply({ ...OUTPUT, edits: [{ ...OUTPUT.edits[0], category: 'grammar' }] });
    expect(JSON.parse((await kb(kbBody(TEXT))).body).edits[0].category).toBe('vocabulary');
  });

  it("restores the straight apostrophe unless the user typed ’", async () => {
    mistral = () =>
      mistralReply({ ...OUTPUT, result: 'l’université', edits: [{ ...OUTPUT.edits[0], to: 'à l’université' }] });
    const straight = JSON.parse((await kb(kbBody("à la université"))).body);
    expect(straight.result).toBe("l'université");
    expect(straight.edits[0].to).toBe("à l'université");
    expect(JSON.parse((await kb(kbBody('l’école et la université'))).body).result).toBe('l’université');
  });

  it('returns the notes of correct and improve, never those of translate and format', async () => {
    const note = { from: 'colour', to: 'color', explanation: 'Testo in inglese americano.' };
    mistral = () => mistralReply({ ...OUTPUT, notes: [note] });
    expect(JSON.parse((await kb(kbBody(TEXT))).body).notes).toEqual([note]);
    expect(JSON.parse((await kb(kbBody(TEXT, {}, 'improve'))).body).notes).toEqual([note]);
    expect(JSON.parse((await kb(kbBody(TEXT, {}, 'translate'))).body).notes).toEqual([]);
  });

  it('treats a missing or malformed notes list as invalid output', async () => {
    const { notes: _, ...withoutNotes } = OUTPUT;
    mistral = () => mistralReply(withoutNotes);
    expect((await kb(kbBody(TEXT))).statusCode).toBe(502);
    mistral = () => mistralReply({ ...OUTPUT, notes: [{ from: 'colour' }] });
    expect((await kb(kbBody(TEXT))).statusCode).toBe(502);
  });

  it('always returns no edits for translate', async () => {
    const res = await kb(kbBody(TEXT, { translate_to: 'en' }, 'translate'));
    expect(JSON.parse(res.body).edits).toEqual([]);
    expect(JSON.parse(mistralPayload().messages[1].content).OPTIONS).toEqual({ translate_to: 'en', register: 'auto' });
  });

  it('answers 504 when Mistral does not answer within 15 s', async () => {
    vi.useFakeTimers();
    mistral = (init) =>
      new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const pending = kb(kbBody(TEXT));
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await pending).toMatchObject({ statusCode: 504, body: '{"error":"upstream_timeout"}' });
  });
});

describe('alerts', () => {
  it('sends at most one alert per type every 15 minutes', async () => {
    vi.useFakeTimers();
    const unsigned = () => handle({ httpMethod: 'POST', path: '/v1/kb', headers: {}, body: '' });
    await unsigned();
    await unsigned();
    expect(alerts()).toHaveLength(1);
    vi.advanceTimersByTime(15 * 60_000);
    await unsigned();
    expect(alerts()).toHaveLength(2);
  });

  it('does not change the response when Telegram is down', async () => {
    fetchMock.mockImplementationOnce(async () => {
      throw new Error('network down');
    });
    const res = await handle({ httpMethod: 'POST', path: '/v1/kb', headers: {}, body: '' });
    expect(res.statusCode).toBe(401);
  });
});

describe('logs', () => {
  it('never contain the user text, the model output or Mistral error bodies', async () => {
    const secret = 'Texte-confidentiel-7Q2';
    const output = { ...OUTPUT, result: `Résultat-confidentiel-9X4 ${secret}` };
    const lines: string[] = [];
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, method).mockImplementation((...args) => void lines.push(args.map(String).join(' ')));
    }

    mistral = () => mistralReply(output);
    await kb(kbBody(secret));
    await kb(kbBody(secret, { explain_in: 'xx' }));
    await kb(kbBody(`${secret} ${'a'.repeat(100)}`));
    mistral = () => new Response(JSON.stringify({ message: `echo ${secret}` }), { status: 500 });
    await kb(kbBody(secret));
    mistral = () => mistralReply(`not json ${secret}`);
    await kb(kbBody(secret));

    const all = lines.join('\n');
    expect(lines.length).toBeGreaterThan(0);
    expect(all).not.toContain(secret);
    expect(all).not.toContain('Résultat-confidentiel-9X4');
  });
});
