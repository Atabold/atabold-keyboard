# Contributing

This is a personal project, shared as it is. I read everything, and I answer when I can: best effort, no schedule. Feedback is the most useful thing you can give.

## Ways to help

- **Share the repository** with someone learning French. That is the support I would like most; I take no money for this.
- **Tell me how to improve it**: ideas, things that confused you in the guides, what you wished it did. Use [Discussions](https://github.com/Atabold/atabold-keyboard/discussions) for ideas and questions.
- **Report a bug**: use the bug template.
- **Ask for another language or app**: use the [adaptation request](https://github.com/Atabold/atabold-keyboard/issues/new?template=adaptation_request.yml), or read [adapt it to your language](docs/guides/adapt-to-your-language.md) and do it.
- **Fix the documentation**, translate the app's strings, or add evaluation cases for the mistakes you make.
- **Change the code**: see below.

## Before you post anything public

Issues, discussions and pull requests are public. **Never paste your own text, a screenshot of your messages, your backend address, an API key, a token, your keystore or your public device key.** Use an invented example sentence. The app keeps no logs on purpose, so a bug report needs only: the version, your phone and Android version, which action you used, and the exact message shown.

A vulnerability, or a possible leak of text, is not an issue: follow [SECURITY.md](SECURITY.md) and report it privately.

## Changing the code

1. For anything bigger than a small fix, open an issue or a discussion first, so we agree before you spend the time.
2. **The privacy rules are the point of the project.** A change that widens what is sent, where, or when, that stores text, or that weakens the integrity checks needs a clear case and will probably be declined. See [privacy](docs/guides/privacy.md) and the [security model](docs/guides/security-model.md).
3. Run the tests:
   - backend: `npm test` in `backend/` (and `npm run build`);
   - app: `./gradlew testUnstableDebugUnitTest --tests "org.futo.inputmethod.latin.kbfr.*"` in the Android repository.
4. A prompt change comes with the result of [the evaluation](docs/guides/customize.md#prompts-and-the-evaluation) before and after, and new cases for what it fixes.
5. Update the guides and the [changelog](CHANGELOG.md) when behaviour changes. New developer documents go in the catalogue in [docs/README.md](docs/README.md).
6. No secrets, no personal data, no instance addresses in any file or commit message.

Contributions to this repository are made under its licence, the [GNU AGPL-3.0-or-later](LICENSE): what you send is licensed the way the rest of the repository is, and I do not ask for a copyright assignment. Contributions to the Android repository are made under the terms of the FUTO Source First License 1.1-kb that governs it, except for files written from scratch, which are also available under the AGPL (see its `LICENSING.md`). **Do not send this fork's changes to FUTO**: they ask for no AI-generated pull requests and require a CLA, and this fork is not theirs.

## AI-assisted work

Much of this project was written with an AI coding assistant, so I have no objection to it in contributions to this repository, as long as you understand the change, tested it, and say in the pull request that an assistant helped. (FUTO's rule against AI-generated pull requests applies to FUTO's repository.)

## Conduct

Be kind and specific. Assume good faith. Disagree with the idea, not the person.
