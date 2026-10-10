# Changelog

All notable changes. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/). Each entry says whether the **backend**, the **app** or both need updating, and in which order: when the request format changes, deploy the backend first.

## [Unreleased]

## [0.1.0] - 2026-10-11

The first public release. It was built and verified on one phone.

### Added

- **App** (the Android repository): FUTO Keyboard fork with the actions Corriger, Améliorer, Traduire, Format, Warm up and Online; the diff panel with per-change accept and reject, notes for American and British English, and Undo; offline dictation with optional automatic formatting; the fixed privacy rules (allowed apps, blocked fields and apps, contaminated fields, nothing stored); the sensitive-data check; the hardware-bound signing key and the integrity checks; the *Correction & privacy* settings; an *About this fork* notice.
- **App:** named "Clavier Atabold" in every language (label only; the application id is `org.futo.inputmethod.latin.kbfr`, so it installs next to FUTO Keyboard), with a launcher icon that is the rounded-square mark of the project's logo: a red letter é (outlined from Gelasio Bold, SIL OFL) on a light card in a blue frame.
- **App:** *Check for updates manually* opens this project's releases on GitHub instead of FUTO's website, the keyboard's ten-week update reminder is off, and a sentence above FUTO's update notice says that new versions are published only on GitHub.
- **App:** FUTO's crash dialog (an email to FUTO) is **off by default**; a switch in *Correction & privacy*, Privacy turns it on.
- **App:** the payment screen gets one card saying that payments go to FUTO and not to the author of this version; the *About this fork* text thanks FUTO, names the author and says what is FUTO's. FUTO's payment flow is untouched.
- **App and backend, no protocol change:** the backend address, the signing-certificate fingerprint and the two language choices come from a git-ignored `kbfr.properties`. A release build stops with an explanation while the address or the fingerprint is missing. `explainIn` (the language of the explanations: `en`, `fr`, `de`, `es` or `it`; English if left out) and `translateTo` (the language *Translate* writes by default: `fr`, `en`, `de`, `es` or `it`; French if left out) only set the first-run defaults of two settings.
- **App and backend:** English, French, German, Spanish and Italian are offered for the explanations and for *Translate*, and the prompts accept any input language that Mistral's models handle.
- **App:** the allowed apps are a list of well-known apps, European ones included, in the same five categories, and more password managers and authenticators are blocked by name. The sensitive-data check recognises the tax and national ID numbers of seven countries.
- **Backend**: a Scaleway function with signed requests, replay protection, rate and daily limits, strict schemas, server-side prompts for `correct`, `improve`, `translate` and `format`, Telegram alerts (in English), a test suite (40 tests), and `npm run package`, which writes the deployable zip on every system.
- **Tools**: a development key and signed test requests (`tools/kb.mjs`), the phone registration script (`tools/register-device.mjs`, which takes the function id from `KB_FUNCTION_ID`), the prompt evaluation (`eval/`, 39 cases, five of them for English speakers learning French and six for German and Spanish), and a link checker for the documentation.
- **Documentation**: suggested settings in the README, how to put the actions on the toolbar, which languages work and how well, install guide, an AI-agent runbook, guides for use, customising, adapting to another language, choosing an LLM provider, privacy and the security model, the architecture notes and the design specification.
- **Licence:** this repository (backend, tools, prompts, evaluation set, documentation) is under the **GNU AGPL-3.0-or-later**. The Android app stays under FUTO's licence, unchanged, because it is FUTO's code; the files written from scratch for the app are also offered under the AGPL (`LICENSING.md` in the app's repository).

### Known limits

- Tested on one phone (a Xiaomi on Android 16); not independently audited.
- The prompt evaluation (39 cases, language-neutral prompts) gets valid JSON every time and passes 35 checks of 39 on *Fast* and 36 on *Accurate*. Both models leave a false friend in place (*librairie* where a library is meant), and *Fast* turns a correct present tense with a future meaning into a future tense; the other misses are labels and notes. Details in the [backend notes](docs/architecture/backend.md#prompt-evaluation).
- Updates from FUTO are not guaranteed to be merged.
- The setup wizard and some help screens inherited from FUTO still say "FUTO Keyboard".
