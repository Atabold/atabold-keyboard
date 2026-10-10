# Security policy

Atabold Keyboard handles private text, so a security problem can be a privacy problem. Thank you for reporting one, and for doing it privately.

## How to report a vulnerability

Use GitHub's **private vulnerability reporting**: on this repository, *Security*, *Report a vulnerability*, or go straight to
<https://github.com/Atabold/atabold-keyboard/security/advisories/new>.

Only the maintainer sees the report. **Please do not open a public issue, a discussion or a pull request for a vulnerability**, and do not post it anywhere before we have talked.

The same button exists on the [Android repository](https://github.com/Atabold/atabold-keyboard-android/security/advisories/new), for problems in the app itself. If you are not sure where it belongs, report it on either one; it will be handled wherever it belongs.

Please include:

- what you found and what an attacker gains;
- the steps to reproduce it, on your own setup, with **invented text**;
- the version or commit, and for the app the Android version and phone;
- how you would like to be credited, or that you want to stay anonymous.

Please **do not include** real messages, your own backend address, API keys, tokens, keystores or your public device key. If your report needs a secret to be understood, say so and we will find a safe way.

## What to expect

This is a personal project, maintained by one person in their spare time. The targets below are good-faith, not a service level:

| Step | Target |
|---|---|
| Acknowledgement | within 7 days |
| First assessment (accepted, declined, or more questions) | within 14 days |
| A fix, or a plan for one | within 90 days |
| Public disclosure | after the fix is released, together with you; if there is no fix within 90 days we agree a date |

Reports are credited in the release notes unless you prefer otherwise. There is no bounty. Reporting in good faith, testing only on your own setup and accounts and never on anyone else's data, will not be met with legal action.

## What counts

In scope, in this project's own code and design:

- a way around the signature check, the replay protection, the limits, or the registration of a device;
- a way around the privacy rules: online features or learning in an app or a field that should be blocked, a request sent without a tap, the sensitive-data check being bypassed in a way it claims to catch;
- the user's text, a secret or a key ending up in a log, a file, a backup, the clipboard history beyond its rules, a crash report, an alert or an error message;
- a way to change the backend address, or to make the app talk to another host;
- an injection that makes the backend do more than correct, translate or format a text;
- a way to run up costs beyond the documented limits;
- mistakes in the documentation that would lead someone to an insecure setup.

Out of scope, because they are declared in the [security model](docs/guides/security-model.md) or belong to others:

- attacks that need root, a debugger, Frida or physical access to an unlocked phone, or a stolen signing keystore together with the phone;
- the counters resetting when the function cold-starts, and the single registered device;
- bugs in code that comes from FUTO Keyboard and that this fork did not change: report those to [FUTO](https://github.com/futo-org/android-keyboard). If in doubt, report here;
- the LLM provider, Scaleway or Telegram themselves: use their programmes;
- a model giving a wrong correction (open a normal issue with an invented sentence);
- social engineering, denial of service against Scaleway or the provider, and automated scanner output without a demonstrated impact.

## Supported versions

Only the latest release and `main`. The Android app does not update itself; after a security release you rebuild, sign and install it, and redeploy the backend if the notes say so.

## If you think your own text leaked

Treat it as a vulnerability and report it here, privately, with the steps and an invented example. Meanwhile, turn the *Online* switch off, revoke your provider's API key and rotate the Scaleway key.
