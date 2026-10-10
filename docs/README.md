# Documentation

Catalog of everything written down about Atabold Keyboard. New docs follow one convention: user-facing how-tos and explanations go in `guides/`; living, current-state references go in `architecture/`; the design specification goes in `specs/`. Docs are written in English. The project overview is the [README](../README.md) at the root.

## Catalog

### Guides (for people who install, use or adapt it)

| Doc | Kind | What it covers |
|---|---|---|
| [guides/getting-started.md](guides/getting-started.md) | Guide | The install guide: accounts and spend cap, the backend, your signing key, the build, installing, registering your phone, updating. |
| [guides/how-it-works.md](guides/how-it-works.md) | Guide | One request step by step, with diagrams; what the model is asked; dictation and automatic formatting; cold start; the design decisions. |
| [guides/using-the-keyboard.md](guides/using-the-keyboard.md) | Guide | The toolbar actions and how to put them on your toolbar, which text is sent, the correction panel, why an action is locked, the sensitive-data check, dictation, the clipboard. |
| [guides/customize.md](guides/customize.md) | Guide | Three levels of change (settings, the function, the app's code): every setting, environment variables, prompts and the evaluation, the allowed apps, what is hard-coded on purpose. |
| [guides/adapt-to-your-language.md](guides/adapt-to-your-language.md) | Guide | Which languages work and how well; what is French-specific and where; how big each kind of language change is; a worked example (explanations in Dutch). |
| [guides/choose-your-llm-provider.md](guides/choose-your-llm-provider.md) | Guide | What the backend needs from a provider, how to use other models or another provider, and what to switch off at Mistral so that your text does not train anything. |
| [guides/privacy.md](guides/privacy.md) | Guide | What leaves the phone, the rules written into the code, what the project does not protect, and what is not the author's responsibility (FUTO's parts, providers). |
| [guides/security-model.md](guides/security-model.md) | Guide | The attacks considered and what stops each one, how requests are signed, which key can lose how much, and the declared limits. |
| [guides/troubleshooting.md](guides/troubleshooting.md) | Guide | Every message the app can show with its cause and fix, plus install, build and backend problems. |

### Architecture (living references)

| Doc | Kind | What it covers |
|---|---|---|
| [architecture/backend.md](architecture/backend.md) | Architecture | How the Scaleway function in `/backend` is built today: modules, request pipeline, configuration, in-memory state, tests, dev tools and the prompt evaluation (run locally, without touching the phone's registration) with its results so far. |
| [architecture/android-fork.md](architecture/android-fork.md) | Architecture | What the fork changes in FUTO Keyboard today: app ID, names and notices, where the update entries lead, instance settings (`kbfr.properties`), `PrivacyPolicy` and where it hooks in, the learning gate, no backups or logs, RAM-only clipboard with sensitive items, the online actions (Corriger, Améliorer, Traduire, Format, Warm up), automatic formatting of dictation, the sensitive-data check before sending, the contaminated field (R3), what was checked and left as is, deviations from the spec, verification, unit tests. |
| [architecture/dev-environment.md](architecture/dev-environment.md) | Architecture | One working build setup (Windows 11): the toolchain, the FUTO fork clone and its remotes, building and signing by hand with `apksigner`, rotating the signing key, and the constraints found. |

### Specification

| Doc | Kind | What it covers |
|---|---|---|
| [specs/keyboard-spec.md](specs/keyboard-spec.md) | Spec | The design brief the project was built from: decisions taken, hardcoded privacy rules, features, settings, backend API and request signing, tamper detection, milestones M0–M6, tests, and how the open points were settled. |

### At the root of the repository

[README.md](../README.md) (overview, repo map, privacy, licences), [INSTALL_WITH_AI.md](../INSTALL_WITH_AI.md) (the runbook for an AI agent), [SECURITY.md](../SECURITY.md) (private reporting), [CONTRIBUTING.md](../CONTRIBUTING.md), [CHANGELOG.md](../CHANGELOG.md), [LICENSE](../LICENSE) (GNU AGPL-3.0-or-later) and [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

## What to read for a given task

| Task | Read |
|---|---|
| Anything, for the first time | The [README](../README.md), then [how it works](guides/how-it-works.md) |
| Install, deploy, update | [guides/getting-started.md](guides/getting-started.md), or [INSTALL_WITH_AI.md](../INSTALL_WITH_AI.md) |
| Using the keyboard, a message you do not understand | [guides/using-the-keyboard.md](guides/using-the-keyboard.md), [guides/troubleshooting.md](guides/troubleshooting.md) |
| Changing a setting, an allowed app, a model or a prompt | [guides/customize.md](guides/customize.md) |
| Another language pair or interface language | [guides/adapt-to-your-language.md](guides/adapt-to-your-language.md) |
| Another LLM provider, training opt-out | [guides/choose-your-llm-provider.md](guides/choose-your-llm-provider.md) |
| Privacy or security questions | [guides/privacy.md](guides/privacy.md), [guides/security-model.md](guides/security-model.md) |
| Picking the project up | [architecture/android-fork.md](architecture/android-fork.md) and [architecture/backend.md](architecture/backend.md), then the [spec](specs/keyboard-spec.md) |
| Backend endpoint, auth, limits, alerts | Spec 7 and 8 ([spec](specs/keyboard-spec.md)), then [architecture/backend.md](architecture/backend.md) |
| Prompts or model choice | Spec 5.1–5.4 and 7.4–7.5, then `backend/prompts/` and the eval section of [architecture/backend.md](architecture/backend.md) |
| Android fork (FUTO), build | Spec 9, then [architecture/dev-environment.md](architecture/dev-environment.md) and [architecture/android-fork.md](architecture/android-fork.md) |
| Privacy rules, allowed apps, clipboard | Spec 4 and 5.5–5.6, then [architecture/android-fork.md](architecture/android-fork.md) |
| Toolbar actions, text selection, warm-up, Corriger / Améliorer / Traduire / Format panel, checks before sending | Spec 5.1–5.4, 5.6 and 5.8, then [architecture/android-fork.md](architecture/android-fork.md) |
| Dictation, automatic formatting | Spec 5.4 and R5, then [architecture/android-fork.md](architecture/android-fork.md) (automatic formatting row) |
