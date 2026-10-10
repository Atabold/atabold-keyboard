export const ACTIONS = ['correct', 'improve', 'translate', 'format'] as const;
export type Action = (typeof ACTIONS)[number];

export const CATEGORIES = [
  'spelling', 'accents', 'elision', 'agreement', 'past_participle_agreement', 'conjugation',
  'tense_mood', 'article', 'preposition', 'pronoun', 'word_order', 'punctuation', 'capitalization',
  'register', 'vocabulary', 'false_friend', 'translation', 'style', 'transcription', 'variant',
] as const;
export type Category = (typeof CATEGORIES)[number];

const OPTION_VALUES = {
  explain_in: ['en', 'fr', 'de', 'es', 'it'],
  target_lang: ['auto', 'fr'],
  translate_foreign: [true, false],
  register: ['auto', 'tu', 'vous'],
  detail: ['short', 'long'],
  profile: ['fast', 'accurate'],
  translate_to: ['fr', 'en', 'de', 'es', 'it'],
  format_style: ['minimal', 'clean'],
  format_fix_grammar: [true, false],
  harmonize_variant: [true, false],
} as const;

export type Options = { -readonly [K in keyof typeof OPTION_VALUES]: (typeof OPTION_VALUES)[K][number] };

// Defaults of the settings screen (SPEC section 6), used for any option the phone omits.
const DEFAULT_OPTIONS: Options = {
  explain_in: 'en',
  target_lang: 'auto',
  translate_foreign: true,
  register: 'auto',
  detail: 'short',
  profile: 'fast',
  translate_to: 'fr',
  format_style: 'clean',
  format_fix_grammar: false,
  harmonize_variant: false,
};

export type KbRequest = { action: Action; text: string; options: Options };
export type Edit = { from: string; to: string; category: Category; explanation: string };
// A word of the other English variety (American vs British), left as is: a notice, not an error.
export type Note = { from: string; to: string; explanation: string };
export type KbResponse = { result: string; detected_lang: string; edits: Edit[]; notes: Note[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseRequest(
  body: unknown,
  maxChars: number,
): { ok: true; request: KbRequest } | { ok: false; error: 'invalid_request' | 'too_large' } {
  const invalid = { ok: false, error: 'invalid_request' } as const;
  if (!isObject(body) || Object.keys(body).some((key) => !['action', 'text', 'options'].includes(key))) return invalid;

  const { action, text, options = {} } = body;
  if (!ACTIONS.includes(action as Action)) return invalid;
  if (typeof text !== 'string' || text.trim() === '') return invalid;
  if (text.length > maxChars) return { ok: false, error: 'too_large' };
  if (!isObject(options)) return invalid;

  const parsed: Record<string, unknown> = { ...DEFAULT_OPTIONS };
  for (const [key, value] of Object.entries(options)) {
    // hasOwn, not `in`: keys like "toString" must not reach Object.prototype.
    if (!Object.hasOwn(OPTION_VALUES, key)) return invalid;
    const allowed: readonly unknown[] = OPTION_VALUES[key as keyof Options];
    if (!allowed.includes(value)) return invalid;
    parsed[key] = value;
  }
  return { ok: true, request: { action: action as Action, text, options: parsed as Options } };
}

// Output checks of SPEC 7.4. Returns null when the model output must be retried.
export function parseModelOutput(content: unknown, input: string, action: Action): KbResponse | null {
  if (typeof content !== 'string') return null;
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return null;
  }
  if (!isObject(data)) return null;

  const { result, detected_lang, edits, notes } = data;
  if (typeof result !== 'string' || result.trim() === '' || result.length > 3 * input.length + 200) return null;
  if (typeof detected_lang !== 'string' || !Array.isArray(edits) || !Array.isArray(notes)) return null;

  // Some models turn the phone's straight apostrophe into a typographic one, which would mark
  // every elision as a change in the diff panel. Keep ’ only if the user typed it.
  const apostrophes = (s: string) => (input.includes('’') ? s : s.replaceAll('’', "'"));

  const parsedEdits: Edit[] = [];
  for (const edit of edits) {
    if (!isObject(edit)) return null;
    const { from, to, category, explanation } = edit;
    if (typeof from !== 'string' || typeof to !== 'string' || typeof explanation !== 'string') return null;
    parsedEdits.push({
      from: apostrophes(from),
      to: apostrophes(to),
      category: CATEGORIES.includes(category as Category) ? (category as Category) : 'vocabulary',
      explanation,
    });
  }
  const parsedNotes: Note[] = [];
  for (const note of notes) {
    if (!isObject(note)) return null;
    const { from, to, explanation } = note;
    if (typeof from !== 'string' || typeof to !== 'string' || typeof explanation !== 'string') return null;
    parsedNotes.push({ from: apostrophes(from), to: apostrophes(to), explanation });
  }
  // Only correct and improve look at English varieties.
  const withNotes = action === 'correct' || action === 'improve';
  return {
    result: apostrophes(result),
    detected_lang,
    edits: action === 'translate' ? [] : parsedEdits,
    notes: withNotes ? parsedNotes : [],
  };
}

// Sent to Mistral as response_format (json_schema, strict). detected_lang comes first so the model
// commits to the text's language before writing the result (with target_lang "auto" it otherwise
// tended to translate texts that were not French into French).
export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    detected_lang: { type: 'string' },
    result: { type: 'string' },
    edits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          explanation: { type: 'string' },
        },
        required: ['from', 'to', 'category', 'explanation'],
        additionalProperties: false,
      },
    },
    notes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['from', 'to', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['detected_lang', 'result', 'edits', 'notes'],
  additionalProperties: false,
};
