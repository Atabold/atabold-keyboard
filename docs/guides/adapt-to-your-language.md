# Adapt it to your language

**What works out of the box.** You write in English, French, German, Spanish or Italian and you are learning French. The explanations come in one of those five languages, as you choose when you install (`explainIn` in `kbfr.properties`), *Translate* writes any of them (`translateTo`), and the app itself is translated into English and Italian. French, English, Italian, German and Spanish all have evaluation cases that were run; the German and Spanish ones passed on 2026-10-10.

**Anything else is possible, and it is a job of a different size depending on what you change.** If you ask, I may do the cheap and general ones for everyone ([adaptation request](https://github.com/Atabold/atabold-keyboard/issues/new?template=adaptation_request.yml); no promise, it is a personal project). Or you do it yourself with this page, which says which files to touch and how to check the result.

## Which languages work, and how well

- **Typing and dictation** are FUTO's: any language it has a dictionary and a voice model for. You add them in the keyboard's *Languages* settings ([install guide, step 7](getting-started.md#7-install-and-set-up-the-keyboard)).
- **What you write.** The app sends the text that is in the field. With *Language of the result* set to *The main language of the text*, the prompts ask the model to correct or improve it in its own language and never to translate it into French. So any input language can work, and how well depends on the model.
- **What Mistral says about its models.** [Its language page](https://docs.mistral.ai/resources/languages) lists 43 languages with "strong expected performance", among them French, German, Spanish, Portuguese, Italian, Dutch, Polish, Arabic, Hindi, Chinese, Japanese, Korean and Russian, and adds that the models "can also perform well in additional languages not listed here". The [model card of Mistral Small 4](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603), the model behind the author's *fast* profile, says it "Supports dozens of languages, including English, French, Spanish, German, Italian, Portuguese, Dutch, Chinese, Japanese, Korean, and Arabic". Both pages were read on 2026-10-10. They describe the models in general, not this project's corrections.
- **What this project measured.** French, English and Italian, and German and Spanish on 2026-10-10 (a text corrected in its own language, a German or Spanish word inside French, explanations and translations in both, dictation and *Improve*: everything passed, details in the [backend notes](../architecture/backend.md#prompt-evaluation)). For any other language, add a few cases to [eval/cases.jsonl](../../eval/cases.jsonl) and run the evaluation before you rely on it ([customise](customize.md#prompts-and-the-evaluation)).
- **What you read.** The explanations and *Translate into* are limited to the five languages above: the options are fixed lists that the server checks.

## How big is your change?

| You want | Size | Touches | Needs |
|---|---|---|---|
| **The app in your language** (menus, messages) | small, no code | one new strings file | rebuild the app |
| **Explanations or Translate in another language** (you are Dutch, say) | an afternoon | backend schema and prompts, the app's language lists, evaluation cases | deploy the backend **first**, then rebuild the app |
| **You also write in another language** (as input) | small | FUTO's dictionary and voice model for it; nothing in the backend if the model handles the language | import the dictionary; try a few evaluation cases |
| **A different language to learn** (Spanish instead of French) | large, days | the prompts' rules, the list of mistake categories, the options, action names, settings texts, evaluation cases | a branch of your own; talk to me first |

## What is French-specific, and where

- **Backend options** ([schema.ts](../../backend/src/schema.ts)): `explain_in` (`en`, `fr`, `de`, `es`, `it`), `translate_to` (`fr`, `en`, `de`, `es`, `it`) and `target_lang` (`auto`, `fr`, where `fr` means "always French"). The server rejects any value outside these lists with a `400`.
- **Prompts** ([backend/prompts/](../../backend/prompts/)): they give the five languages as examples of what the user writes, map each `explain_in` code to a language name, describe `target_lang` in terms of French, list French mistakes (elision, past participle agreement, tu and vous), and the format prompt gives fillers per language.
- **Mistake categories** (`CATEGORIES` in schema.ts): `elision` and `past_participle_agreement` are French grammar; `variant` is American / British English. A new target language needs its own categories, and the app has a label for each one (`kbfr_cat_*` strings).
- **The app**: the language choices in [KbfrSettings.kt](https://github.com/Atabold/atabold-keyboard-android/blob/main/java/src/org/futo/inputmethod/latin/kbfr/KbfrSettings.kt), the strings `kbfr_lang_*` and `kbfr_target_lang_fr` ("Always French"), the first-run defaults `KbfrExplainIn` and `KbfrTranslateTo` (set by `explainIn` and `translateTo` in `kbfr.properties`, checked in `build.gradle`), the French action names (Corriger, Améliorer, Traduire), and the national ID numbers that the sensitive-data detector recognises (seven countries).

## Worked example: explanations in Dutch

This is the template for the other languages.

1. **Backend schema.** In `schema.ts` add `'nl'` to `explain_in` and, if you want to translate into Dutch, to `translate_to`.
2. **Prompts.** In `correct.txt`, `improve.txt` and `format.txt` extend the mapping `("en" English, "fr" French, "de" German, "es" Spanish, "it" Italian)` with `"nl" Dutch`; in `translate.txt` the same for `translate_to`.
3. **Evaluation.** Add cases to [eval/cases.jsonl](../../eval/cases.jsonl) with `"options": {"explain_in": "nl"}`: a few typical mistakes of a Dutch speaker in French (false friends, gender, prepositions), a Dutch word inside a French sentence, an already-correct text. Run the evaluation as described in [customise](customize.md#prompts-and-the-evaluation) and read every failure.
4. **Tests.** `npm test` in `backend/` must still pass. Add `'nl'` to the list of accepted languages in the test that checks them.
5. **The app.** In `KbfrSettings.kt` add `"nl" to R.string.kbfr_lang_nl` to the lists for the explanation language and for *Translate into*, add `<string name="kbfr_lang_nl" translatable="false">Nederlands</string>` to `kbfr-strings.xml`, and, if you want it as the install-time default, add `nl` to the values `explainIn` and `translateTo` accept in `build.gradle`. Run the app's unit tests.
6. **Roll out in the right order.** The backend rejects options it does not know. So: deploy the backend first, then install the new app. The other way round, every request from the new app fails with *Request rejected by the backend*.

## A new interface language

Copy `java/res/values/kbfr-strings.xml` to `java/res/values-xx/kbfr-strings.xml` (`xx` is the language code) and translate the values. Leave the `translatable="false"` strings and the placeholders (`%1$d`, `%1$s`) alone, and escape apostrophes as `\'`. FUTO's own screens have their own translations. Nothing in the backend changes.

## A different language to learn

Be ready for a real project, not a setting. Roughly:

1. Decide the new category list (the mistakes that matter in that language) and update `CATEGORIES`, the app's `kbfr_cat_*` labels, and `Correction.kt` where categories are interpreted.
2. Generalise `target_lang`: `fr` currently means French.
3. Rewrite the prompt rules for the new language and keep the structure: minimum edits, no rephrasing of correct text, foreign words translated, names and numbers untouched.
4. Rename the actions and the settings texts that say French.
5. Rebuild the evaluation set from scratch for the new language: it is what tells you whether the prompts work at all.

If you do this, a fork with a clear name is the honest way to ship it, and I would like to hear about it.

## Check list for any change

- [ ] the backend tests pass (`npm test` in `backend/`)
- [ ] the app's unit tests pass (`./gradlew testUnstableDebugUnitTest --tests "org.futo.inputmethod.latin.kbfr.*"`)
- [ ] the evaluation was run and every failure was read
- [ ] backend deployed before the app when the options changed
- [ ] the privacy rules were not touched: if you changed them, you know why ([privacy](privacy.md))
