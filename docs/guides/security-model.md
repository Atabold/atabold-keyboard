# Security model

What the design protects, what each protection costs an attacker, and what it does **not** cover. For the privacy side (what leaves the phone) read [privacy](privacy.md). To report a weakness privately, see [SECURITY.md](../../SECURITY.md).

Nobody has audited this independently. A security review of the project was done by the author with an AI assistant before the first release; it led to two changes that are now part of the design: the backend address was fixed in the build, and the signing password left the disk (release builds are signed by hand).

## The setup in one paragraph

A phone holds a signing key that was generated inside its secure hardware and cannot be exported. Your function is public, because the phone calls it without any Scaleway credential, but it answers only requests signed by the one public key you registered. The provider key lives only in the function's secrets. Money is capped at the provider, and the function can only ever run on one instance.

## What an attacker can try

| Attack | What stops it | What is left |
|---|---|---|
| **Call your public function** with junk or guessed requests | Everything without a valid signature is rejected within milliseconds, and costs almost nothing; `max-scale=1` and a billing alert cap the hosting cost. An unknown key sends you a Telegram alert. | A little hosting cost and some noise, until you notice. |
| **Replay a captured request** | TLS makes capturing hard. A valid signature must be fresh (30 seconds) and its nonce unseen (60 seconds). A replay sends an alert. | Within 30 seconds, nothing stops an attacker who already reads your TLS traffic. |
| **Steal your provider key** | It lives only in the function's secrets, never on the phone, and the key belongs to a workspace with a spend cap. A `429` from the provider sends an alert; if you did not expect it, revoke the key. | The cap, for the month. |
| **Steal the phone's signing key** | It cannot leave the secure hardware (StrongBox if the phone has it, otherwise the TEE). It works only through the app on that phone. | An attacker with the unlocked phone can use the app as you can, within the rate limits and the cap. |
| **Modify the app** or **re-sign it** | The app refuses online features if its signing certificate is not yours, if it is a debug build, or if the device key is not in secure hardware, and shows a red banner. A re-signed APK cannot be installed as an update, so the old app must be uninstalled first, which erases the device key; the new copy has a new, unregistered key, so the function rejects it and alerts you. | Registering a new key needs your Scaleway account (with two-factor authentication). |
| **Point the keyboard at another server** | The address is compiled into the app and shown read-only. There is no editable URL and no settings backup that can change it. | A rebuilt app, which fails the certificate check. |
| **Read your text from the phone** (logs, backups, clipboard history, crash dumps) | Nothing is written: no backups, release builds have no log calls, the clipboard history is memory only, sensitive items vanish after 60 seconds. | Memory of a running, compromised phone. |
| **Put instructions in the text** (prompt injection) | The text is passed as data and the prompt says to ignore instructions in it; the answer must match a strict JSON schema; the model has no tools and sees no secrets. The evaluation contains an injection case. | A wrong correction. |
| **Make the phone spend a lot** (a compromised phone) | The function limits requests (20 a minute, 300 a day, 4,000 characters) and the provider's cap ends it. The phone cannot choose a model, only a profile. | The cap. |

## How a request is signed

Each request carries four headers: `X-KB-Key-Id` (the first 16 hex digits of the SHA-256 of the public key), `X-KB-Timestamp`, `X-KB-Nonce` (16 random bytes, base64url) and `X-KB-Signature` (ECDSA P-256 over SHA-256, DER, base64). The signed string is:

```text
v1\n{METHOD}\n{PATH}\n{timestamp}\n{nonce}\n{hex(sha256(body))}
```

The function hashes the body **exactly as it arrives**, never a re-serialised copy. It checks the key id, then the signature, and only then the timestamp and the nonce, so a "replay" alert can only come from a request your phone really signed. The nonce is remembered only after a valid signature. The host is not part of the signed string; that is why the address must not be changeable on the phone.

## Keys, and the most each can lose

| Secret | Where | Protection | Most it can lose |
|---|---|---|---|
| Phone signing key | the phone's secure hardware | not exportable; not usable without the app | the spend cap |
| Provider API key | your function's secrets | a workspace with a hard cap; an alert on `429` | the cap |
| Scaleway API key | your computer's CLI configuration | only `FunctionsFullAccess` on one project, with an expiry date | that project's functions |
| Telegram bot token | your function's secrets | a dedicated bot that can only write to your chat | unwanted messages |
| Release keystore (`.jks`) | your computer, plus an encrypted backup | outside the repositories; its password in a password manager; you sign by hand. If it may have leaked, rotate it: a new password does not help against a copied file | forged but "valid" updates, which still need access to your phone |
| Your accounts | the providers | two-factor authentication | everything above |

## Registration

Registering a phone is manual and single: you set one public key as a secret of the function, with a script, from a computer where you are logged in to Scaleway. There is no registration endpoint to attack. A new key replaces the old one. Anyone who can register a key can change your function, so protect that account.

## Declared limits

- **Root, Frida, a debugger, or physical access to an unlocked phone.** Someone who can change the app while it runs can use your key as you do. No check inside the app can promise otherwise.
- **A stolen keystore together with access to your phone** would allow an update that looks valid.
- **The counters and the replay memory live in memory** and reset when the function cold-starts. That is accepted: the real ceilings are the provider's cap and the single instance.
- **One phone at a time.** There is no multi-device support.
- **The Telegram alerts depend on Telegram** and on the two secrets being set. Silence only means something if you have checked once that alerts do arrive.
- **The source is public.** Nothing relies on the code being secret; everything relies on the keys.
- **FUTO's code is FUTO's.** The keyboard engine, the speech models, the payment screens and the crash-report dialog are not covered by this model (see [privacy](privacy.md#what-is-not-mine)). Updates from FUTO are not guaranteed to be merged.
- **The only clipboard write** the fork makes is the *Copy public key* button, which copies a public value. Android 13 and later show a preview of what was copied; the keyboard itself then treats that text as sensitive and removes it after 60 seconds. Corrected text is inserted into the field and never copied.

## Supply chain

The backend has no runtime dependencies: only Node.js built-ins and `fetch`. Its development tools are locked by `package-lock.json`, and CI runs with a read-only token and actions pinned by commit. The Android build uses FUTO's dependencies and Gradle's. You build the app yourself from source; there is no binary you are asked to trust.
