import { readFileSync } from 'node:fs';
import { config } from './config.js';
import { ACTIONS, OUTPUT_SCHEMA, parseModelOutput, type Action, type KbRequest, type KbResponse, type Options } from './schema.js';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const TIMEOUT_MS = 15_000;
const TEMPERATURE = 0.1;
const MAX_TOKENS_CAP = 4_000;
// The output is the text again plus the explanations. At 3-4 chars per token, one token per input
// char leaves room for the text; the fixed part covers explanations on short texts.
const MAX_TOKENS_BASE = 600;

const PROMPTS = Object.fromEntries(
  ACTIONS.map((action) => [action, readFileSync(new URL(`../prompts/${action}.txt`, import.meta.url), 'utf8')]),
) as Record<Action, string>;

// The options each prompt reads. `profile` never reaches the model: the server maps it to a model (SPEC 6).
const PROMPT_OPTIONS: Record<Action, (keyof Options)[]> = {
  correct: ['explain_in', 'target_lang', 'translate_foreign', 'register', 'detail', 'harmonize_variant'],
  improve: ['explain_in', 'target_lang', 'translate_foreign', 'register', 'detail', 'harmonize_variant'],
  translate: ['translate_to', 'register'],
  format: ['format_style', 'format_fix_grammar', 'explain_in', 'detail'],
};

export type LlmOutcome =
  | { ok: true; response: KbResponse }
  | { ok: false; error: 'provider_limit' | 'upstream_error' | 'upstream_timeout' };

export async function runAction(request: KbRequest): Promise<LlmOutcome> {
  const { action, text, options } = request;
  const payload = JSON.stringify({
    model: config.models[options.profile],
    temperature: TEMPERATURE,
    max_tokens: Math.min(MAX_TOKENS_CAP, MAX_TOKENS_BASE + text.length),
    response_format: { type: 'json_schema', json_schema: { name: 'kb_result', schema: OUTPUT_SCHEMA, strict: true } },
    messages: [
      { role: 'system', content: PROMPTS[action] },
      {
        role: 'user',
        content: JSON.stringify({
          TEXT: text,
          OPTIONS: Object.fromEntries(PROMPT_OPTIONS[action].map((key) => [key, options[key]])),
        }),
      },
    ],
  });

  // One deadline for both attempts, so a retry cannot push the function past its own 30 s timeout.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(MISTRAL_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.mistralApiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: payload,
        signal: controller.signal,
      });
      // Error bodies are never read: they may echo the user's text (SPEC 7.6).
      if (res.status === 429) {
        await res.body?.cancel();
        return { ok: false, error: 'provider_limit' };
      }
      if (!res.ok) {
        await res.body?.cancel();
        return { ok: false, error: 'upstream_error' };
      }
      const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
      const response = parseModelOutput(data.choices?.[0]?.message?.content, text, action);
      if (response) return { ok: true, response };
    }
    return { ok: false, error: 'upstream_error' };
  } catch {
    return { ok: false, error: controller.signal.aborted ? 'upstream_timeout' : 'upstream_error' };
  } finally {
    clearTimeout(timer);
  }
}
