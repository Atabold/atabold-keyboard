# Backend (Scaleway function)

Current state of `/backend`, the public Scaleway Serverless Function between the phone and Mistral. The contract it implements is the spec, sections 7 and 8 ([spec](../specs/keyboard-spec.md)).

Status: the author's own instance is **deployed** (region `fr-par`, function `kb`); its URL, namespace and key ids are deliberately not published. Only the phone's key is registered; the PC development key gets `401`. Telegram alerts are configured on it (secrets `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`); a test unsigned request returned `401` and triggered the "unregistered device" alert. In this document "the user" is the project's author.

## Layout

| Path | Role |
|---|---|
| `src/handler.ts` | Entry point `handle(event)`: routing, request pipeline, response, one metadata log line per request |
| `src/auth.ts` | Request signature (ECDSA P-256, DER), timestamp window, nonce cache |
| `src/limits.ts` | Per-minute and daily counters for `/v1/kb` |
| `src/schema.ts` | Request validation with the settings defaults, model output validation, output JSON schema |
| `src/mistral.ts` | Prompt selection, Mistral call with structured output, one retry, shared 15 s deadline |
| `src/alerts.ts` | Telegram alerts with fixed texts, deduplicated per type for 15 min |
| `src/config.ts` | Environment variables, read once per cold start |
| `prompts/*.txt` | System prompt per action (`correct`, `improve`, `translate`, `format`); read at cold start |
| `test/` | vitest suite calling `handle` with simulated Scaleway events |
| `scripts/serve-local.mjs` | Serves the compiled handler on `http://localhost:8080` |

No runtime dependencies: only `node:crypto`, `node:fs` and the global `fetch`. Dev dependencies are TypeScript, vitest and `@types/node`. The official Scaleway local emulator (`@scaleway/serverless-functions`) was tried and dropped because it pulls in fastify 4, which has unfixed high-severity advisories; `serve-local.mjs` replaces it with about 20 lines of `node:http`.

## Request pipeline

Only `POST /v1/kb` and `POST /v1/ping` exist; anything else gets `404` with an empty body and is not logged.

1. **Body bytes**: `event.body`, base64-decoded when `isBase64Encoded`. The signature hash is computed on these bytes, never on re-serialized JSON.
2. **Header names** are lowercased (Scaleway may deliver any casing).
3. **Authentication** (`auth.ts`): key id must match `DEVICE_PUBLIC_KEY_SPKI` → signature → timestamp within ±30 s → nonce not seen in the last 60 s. The signature is verified *before* timestamp and nonce, so a `replay` alert only fires for requests the registered key really signed; everything else is `unauthorized`. Nonces are stored only after a valid signature. Failure: `401` and an alert.
4. **Ping** stops here with `204` and does not touch the counters (spec 5.8).
5. **Limits** (`limits.ts`): daily cap (UTC day) first, then the per-minute limit. The daily cap sends an alert.
6. **Validation** (`schema.ts`): body ≤ 16 KB, JSON object with only `action`, `text`, `options`; every option key and value must be in the allowed set (checked with `Object.hasOwn`, so names like `toString` are rejected); omitted options take the defaults of spec section 6; `text.length ≤ MAX_CHARS` (UTF-16 units, same as Kotlin `String.length`).
7. **Model call** (`mistral.ts`): the model comes from the profile on the server; the user message is `{"TEXT": ..., "OPTIONS": ...}` with only the options that prompt reads. `response_format` is `json_schema` with `strict: true`, with `detected_lang` as the first property: the model commits to the text's language before writing `result`. Without that order, both models translated a text that was not French (an Italian one, in the test) into French with `target_lang: "auto"`. Invalid output gets one retry; both attempts share one 15 s deadline so the function cannot exceed its own 30 s timeout. Mistral error bodies are never read.
8. **Output checks**: `result` non-empty and at most `3 × input + 200` characters, edits and `notes` well-formed (a missing `notes` is invalid output, like missing `edits`), unknown `category` → `vocabulary`, `translate` always returns `edits: []`, and only `correct` and `improve` return `notes` (English-variety notices, spec 7.1; the option `harmonize_variant` turns them into `variant` edits instead). The typographic apostrophe `’` in `result` and edits becomes `'` unless the input already contained `’`: `mistral-small` swaps it on its own, which would mark every elision as a change in the diff panel.

Error codes and statuses follow spec 7.1: `invalid_request` 400, `unauthorized` 401, `too_large` 413, `rate_limited` / `daily_cap` / `provider_limit` 429, `upstream_error` 502, `upstream_timeout` 504.

## Configuration

| Variable | Kind | Default in code |
|---|---|---|
| `DEVICE_PUBLIC_KEY_SPKI` | secret | none: every request gets `401` |
| `MISTRAL_API_KEY` | secret | none |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | secret | none: alerts are skipped |
| `MODEL_FAST`, `MODEL_ACCURATE` | plain | `mistral-small-latest`, `mistral-medium-latest` |
| `RATE_PER_MINUTE`, `DAILY_CAP`, `MAX_CHARS` | plain | 20, 300, 4000 |

## In-memory state

Nonce cache, counters and alert deduplication live in module variables. With `max-scale 1` there is one instance; all of it resets on a cold start. This is accepted in spec 7.0.

## Logs

One JSON line per request: `event`, `path`, `status`, `error`, `ms`, `chars`. Never bodies, text, model output or Mistral error bodies. Failed Telegram deliveries log `alert_failed` with the type only. A test asserts that no console output contains the user text or the model output.

## Commands

From `backend/`:

```sh
npm test                 # vitest, 40 tests
npm run build            # tsc -> dist/
npm run package          # build + function.zip (package.json, dist/, prompts/)
DEVICE_PUBLIC_KEY_SPKI=... MISTRAL_API_KEY=... npm run serve   # local HTTP on :8080
```

From the repository root (`tools/`, development key in `tools/.dev-key.pem`, git-ignored):

```sh
node tools/kb.mjs keygen                 # once; prints DEVICE_PUBLIC_KEY_SPKI and the key id
node tools/kb.mjs pubkey                 # print it again
node tools/kb.mjs ping <base-url>        # expect 204
node tools/kb.mjs kb <base-url> correct "Je suis allé à la université" [fast|accurate]
```

### Registering a device key

```sh
node tools/register-device.mjs <SPKI base64>   # the phone key, from Settings → Correction & privacy → Share
node tools/register-device.mjs --dev           # the PC development key, e.g. before node eval/run.mjs
```

It checks that the value is an EC P-256 SPKI, prints the key id to compare with the app, sets the function secret `DEVICE_PUBLIC_KEY_SPKI` and then runs `function function deploy`: updating a secret alone does not restart the running instance. `deploy` answers `pending` at once and the function is `ready` again after 20–60 s; the script polls until then. The function's `ready_at` field is not usable for this: it still holds the creation date after every redeploy. `KB_FUNCTION_ID` must hold the id of the function (`function function list`). `SCW_CLI` overrides the CLI command name (default: `scaleway-cli` on Windows, the winget alias, and `scw` elsewhere). Only one key is registered at a time: the phone's; the evaluation needs `--dev` first and the phone key afterwards.

Verified locally: signed ping → `204`; signed `/v1/kb` with an invalid Mistral key → `502 upstream_error`; unsigned → `401`; unknown path → `404`.

## Prompt evaluation

`eval/cases.jsonl` holds 39 cases. They cover:
- typical errors, a word of another language inside French, a text in another language with `target_lang` auto and fr (the Italian cases are called `it-*`);
- brands, URLs, emoji, loanwords, mentions and code left alone;
- tu/vous, already-correct texts, prompt injection;
- improve: a free one, a misplaced adverb, a missing object pronoun, a repeated noun, and an already-natural text that must stay identical;
- translate, format;
- an American text with one British word, with `harmonize_variant` off and on;
- five cases for English speakers learning French (`en-*`: a false friend, an English word inside French, an English text corrected in English, a preposition after "commencer", an English to French translation), run once with the whole set (below): the false friend fails;
- six cases for German and Spanish, as input languages (`de-*`, `es-*`: a text corrected in its own language, a word inside French, a translation into French), run on 2026-10-10: all pass (below).

After the first two runs below the four prompts were reworded to be language-neutral: they no longer call the user a "native Italian speaker" and now say the user writes French and other languages (English, German, Spanish or Italian, for example) and is learning French (`translate` and `format` are as neutral). That wording was run first on the German and Spanish cases, then on the whole set (the last two results below).

Each case lists expectations: `contains`, `not_contains`, `unchanged`, `edits_empty`, `category`, `note` (a `notes` entry with that `from` and `to`).

```sh
node eval/run.mjs <base-url>
```

It sends one ping first (its latency includes any cold start), then every case with both profiles, one request every 3.1 s to stay under `RATE_PER_MINUTE=20` (79 requests, well under the daily cap). It prints each failure with the model's result, valid-JSON counts and the median latency per profile; a network error counts as a failed case.

**Run it locally**, against `npm run serve`, so the phone stays registered and a prompt is tested before it is deployed. The user starts the server in their own PowerShell:
- `DEVICE_PUBLIC_KEY_SPKI` set to the development key, from `node tools/kb.mjs pubkey`;
- `MISTRAL_API_KEY` typed with `Read-Host`, so it stays out of the shell history and out of Claude's view.

Then `node eval/run.mjs http://localhost:8080`. The server reads the prompts only at start, so it must be restarted after each prompt change. The alternative is the deployed function with the development key registered (`register-device.mjs --dev`), which locks the phone out until its key is registered again.

Results of the first evaluation, after the prompt fixes (models `mistral-small-latest` / `mistral-medium-latest`):

| Profile | Valid JSON | Checks passed | Median latency (warm) |
|---|---|---|---|
| `fast` | 22/22 | 21/22: labels the foreign word in a French sentence `spelling` instead of `translation` (the text itself is right) | 773 ms |
| `accurate` | 22/22 | 22/22 | 786 ms |

The first run also found: a text in Italian translated into French with `auto` (fixed by the schema order above), `’` instead of `'` (fixed on the server), a correct present tense rewritten as a future by `fast` (fixed by the "correct in standard usage is not an error" rule), and one wrong test case (an indirect question takes no `?`). A cold start was not measured separately yet.

Results of the second evaluation, on a local server, after the `improve` change below:

| Profile | Valid JSON | Checks passed | Median latency |
|---|---|---|---|
| `fast` | 28/28 | 26/28 | 895 ms |
| `accurate` | 28/28 | 26/28 | 909 ms |

All `improve` cases pass with both profiles. The four failures are all `correct` cases:
- `fast` still labels the foreign word `spelling`;
- `fast` changes "colour" in the American text although `harmonize_variant` is off. The phone already turns such a change back (`Correction.explain`, `keepAsWritten`);
- `accurate` leaves "colour" as written but adds no note;
- `accurate` returns the prompt-injection text unchanged but with an edit anyway, so `unchanged` fails. The injection itself did not work.

These were the first runs of the two English-variety cases.

**The `improve` change.** The user asked that Améliorer, besides rephrasing, never leave a grammar error. A result had kept a missing object pronoun ("j'ai trouvé passionnant" instead of "je l'ai trouvé passionnant"). Rule 4 now ends with "the result must be grammatically correct: a rephrasing never leaves an error behind", naming adverb position in compound tenses and object pronouns, without example sentences.

A first version with example sentences was evaluated and dropped. The models copied the examples: they always answered "je l'ai beaucoup aimé" where the user preferred the freer "J'ai beaucoup aimé le film.". `fast` also dropped a clause ("J'ai lu") while rephrasing.

Results of the German and Spanish run (2026-10-10, local server, the language-neutral prompts of this repository). It ran the six `de-*` and `es-*` cases and ten more, written for the occasion and not kept in `cases.jsonl`: explanations in German and in Spanish, a French text translated into German and into Spanish, dictation with the fillers "äh" and "eh", `improve` on a German and a Spanish text, and a correct German and Spanish text that must come back unchanged.

| Profile | Valid JSON | Checks passed | Median latency |
|---|---|---|---|
| `fast` | 16/16 | 16/16 | 818 ms |
| `accurate` | 16/16 | 16/16 | 739 ms |

Every answer was also read. A German or Spanish text is detected as such and corrected in its own language, never translated into French; the explanations come in the language asked for; "Freund" and "amigo" inside a French sentence become "ami" with category `translation`. Four small things the checks do not catch, none of them caused by the German and Spanish wording:
- `fast` fixed "pelicula" in the Spanish text but listed no edit for it;
- `fast` lists the two commas it added when improving the German text as one edit ("dass er" → "dass er");
- `fast` lists the fillers it removed in `format`, which the prompt says are not listed;
- `accurate` labels the dropped "yo" `word_order` instead of `style`.

Results of the whole evaluation with the language-neutral prompts (2026-10-11, local server, `mistral-small-latest` / `mistral-medium-latest`, all 39 cases):

| Profile | Valid JSON | Checks passed | Median latency |
|---|---|---|---|
| `fast` | 39/39 | 35/39 | 842 ms |
| `accurate` | 39/39 | 36/39 | 774 ms |

Two misses are new, and repeating them gave the same answer every time (5 runs on `fast`, 3 on each profile):
- both profiles leave "Je vais à la librairie pour emprunter des livres gratuitement." unchanged: the false friend *librairie* (a bookshop) where a library, *bibliothèque*, is meant is not caught (`en-false-friend-library`, its first run);
- `fast` turns the correct "je te réponds demain" into "je te répondrai demain" (category `conjugation`), although the prompt says that the present tense for a near future is not an error (`already-correct-2`, which passed in the second evaluation). Whether the new wording or a newer model behind `mistral-small-latest` causes it was not tested.

The other misses were seen before: `fast` labels the Italian word inside French `spelling` instead of `translation` (the text is right); `fast` changes "colour" although `harmonize_variant` is off (the phone turns it back), and `accurate` leaves it but writes its note the wrong way round ("color" → "colour"); `accurate` returns the prompt-injection text unchanged, with two edits that change nothing (the injection did not work).

Every answer was also read. Things the checks do not catch:
- edits that change nothing or do not match the result, on both profiles: `accurate` says that "paie" must be "paye" (wrong: both are correct) and leaves "paie"; `fast` lists "regarde → regardez" and leaves "regarde". The app shows such an edit under *Other explanations*, without a checkbox, so it never changes the text, but its explanation can be wrong;
- `fast` starts some explanations with the language code ("en: ...");
- `fast` adds a note about capitalising "@marie", although notes are meant for American and British spelling.

The release keeps these prompts. A fix for the two new misses needs its own round of cases, for example correct uses of words that are often false friends, so that a stricter rule does not start changing correct text.

## Deploy

With the Scaleway CLI configured (see [dev-environment.md](dev-environment.md); the command is `scaleway-cli`):

```sh
cd backend && npm run package
scaleway-cli function deploy namespace-id=<your namespace id> name=kb runtime=node24 zip-file=function.zip
```

`deploy` finds the existing function by name, uploads the zip and redeploys; it keeps the function's settings. The function was created once with `scaleway-cli function function create`: `runtime=node24`, `handler=dist/handler.handle`, `min-scale=0`, `max-scale=1`, `memory-limit=128`, `timeout=30s`, `privacy=public`, `http-option=redirected` (HTTP gets a 301 to HTTPS), the plain variables of the configuration table, and `DEVICE_PUBLIC_KEY_SPKI` as a secret. `MISTRAL_API_KEY` is a secret on the namespace, set by the user in the console.

- The zip must be a real zip: `npm run package` runs `scripts/package.mjs`, which uses Windows' `tar.exe` (bsdtar, whose `-a` writes a zip) on Windows and `zip` elsewhere, because Git Bash's GNU `tar` writes a plain tar archive even when the name ends in `.zip`, and Scaleway's build step rejects it ("error during build preparation phase").
- Verified on the live function: the handler setting `dist/handler.handle` works, `event.path` arrives as `/v1/kb`, and the signature over that path verifies.
