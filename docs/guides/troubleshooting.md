# Troubleshooting

Start with the message you see. The app is built so that **typing is never blocked**: whatever fails, you can keep writing.

## Messages in the app

Quoted as in the English interface. The Italian interface says the same in Italian.

### Locks (the action is dimmed with a padlock)

See [using the keyboard](using-the-keyboard.md#why-an-action-is-locked) for *App not allowed*, *App always blocked*, *Password or code field*, *Incognito mode*, *Online features off*, *Wi-Fi only: not connected to Wi-Fi* and *Sensitive data pasted in this field*. They are the product working, not faults.

### Integrity

| Message | Meaning | What to do |
|---|---|---|
| *Integrity compromised: different APK signature* | The APK is not signed with the certificate whose fingerprint is in your `kbfr.properties`. | You installed the file Gradle leaves (it carries a public FUTO key), or signed with another keystore. Sign with your own keystore and check with `apksigner verify --print-certs`: one signer, your fingerprint. Then reinstall. If the installed app has another signature, Android refuses the update: uninstall it first (this erases the device key, so register the phone again). |
| *Integrity compromised: debug build* | A debug build is installed. Debug builds are signed with a public key and are never trusted. | Install a release build. |
| *Integrity compromised: key not in secure hardware* | The phone's Keystore is software only. | There is no workaround: the check protects you. Use a phone with a hardware-backed Keystore. |

A red line stays above the toolbar while any check fails, and every online action is off. Test connection is refused too, so a tampered build does not even ping.

### The connection

| Message | Meaning | What to do |
|---|---|---|
| *Registered: the backend accepts this phone* | All good. | – |
| *Not registered: the backend does not know this key* | The function has another key, or none. | Register the phone ([install guide, step 8](getting-started.md#8-register-your-phone)). Common causes: you regenerated the key, reinstalled the app, or registered the development key to run the evaluation and did not put the phone's key back. |
| *Invalid URL: it must start with https:// and have no path* or *Not set in this build* | The app was built without a valid `endpoint`. | Fix `kbfr.properties`, rebuild, sign, reinstall. The address is not a setting on purpose. |
| *Backend unreachable* | No network, airplane mode, *Wi-Fi only* without Wi-Fi, or the function is down. | Check the connection; check the function is `ready` in the Scaleway console. |
| *Unexpected answer from the backend* | Neither `204` nor `401`. | Check the function's status and logs. |
| *Blocked: integrity compromised* | See above. | – |

### When you tap an action

| Message | Meaning | What to do |
|---|---|---|
| *No text to correct / improve / translate / format* | The field (or the selection, in email and documents) is empty. | Write something. |
| *Text too long (max N characters)* / *Select a part (max N characters)* | Over the character limit. The app never cuts your text. | Shorten it, select a part (email and documents), or raise the limit in the settings (up to 4,000). |
| *Cannot read the text of this field* | The app does not let the keyboard read it. | Try another field or app. |
| *Not sent, sensitive data: …* | The sensitive-data check found something you set to *Block*. Only the kind is shown. | Remove it, or change the rule for that kind in the settings. |
| *Text changed in the meantime* | The text changed between sending and inserting, so nothing was replaced. | Tap the action again. |
| *No errors found* / *Nothing to improve* / *The text is already in that language* / *The text is already formatted* | Nothing to change. | – |
| *No answer within N s* | Slow network, or a cold start. | Tap **Warm up**, then try again; or raise the timeout (up to 30 s). |
| *Device not registered* | The function answered `401`. | As *Not registered* above. |
| *Request rejected by the backend* | `400`: the request is not what the function expects. Usually the app is newer than the backend (a new option the backend does not know). | Deploy the backend first, then update the app. Check the [changelog](../../CHANGELOG.md). |
| *Text too long for the backend* | `413`: more than the function's `MAX_CHARS`, or a body over 16 KB. | Shorten the text, or raise `MAX_CHARS` on the function. |
| *Too many requests: try again in a minute* | `429`: more than `RATE_PER_MINUTE` (20). | Wait a minute. |
| *Daily limit reached* | `429`: more than `DAILY_CAP` (300) since midnight UTC. A Telegram alert was sent. | Wait, or raise `DAILY_CAP` and redeploy. |
| *Provider monthly budget used up* | `429` from the provider: its spend cap is reached, or it is rate limiting you. A Telegram alert was sent. | Look at the provider's console. **If you did not expect it, revoke the API key**: someone else may be using it. |
| *The model gave no valid answer* | `502`: the provider failed or answered something invalid twice. | Try again. If it persists, run the evaluation and check the provider's status. |
| *The model did not answer in time* | `504`: the provider took longer than 15 seconds. | Try again. |
| *Not formatted: …* / *Not formatted, sensitive data: …* | Automatic dictation formatting did not run; your text went in as dictated. | Read the reason that follows. |

## Install and build

| Problem | Cause | Fix |
|---|---|---|
| Gradle stops: *A release build needs kbfr.properties…* | `android/kbfr.properties` is missing or one of its two values is empty. | Copy `kbfr.properties.example`, fill in `endpoint` and `expectedCertSha256`. |
| Gradle stops: *endpoint must be a bare https origin* / *expectedCertSha256 must be the 64 hex digits* | A typo in `kbfr.properties`. | The endpoint is `https://host` with no path; the fingerprint is 64 hex digits, colons allowed. |
| Version code -1, or *VERSION_CODE env variable not set* warnings | The clone has no local `master` branch, so the build cannot count commits. | Set `VERSION_CODE` and `VERSION_NAME` before building. |
| Gradle or Kotlin fails oddly | Wrong JDK. | Use JDK 17 for Gradle (`JAVA_HOME`). Gradle 8.14 does not work with JDK 25. |
| The locale step fails with an encoding error on Windows | Python reading UTF-8 files with the Windows code page. | The fork already sets `PYTHONUTF8=1`; make sure `python` (Windows) or `python3` runs. |
| Native build errors on Windows, or paths that are too long | Spaces or long paths. | Keep the project in a short path without spaces, and run `git config core.longpaths true`. |
| Missing files in `android/`, or model files that are tiny text pointers | Cloned without `--recursive`, or without git-lfs. | `git lfs install`, then `git submodule update --init --recursive`. |
| `adb install`: `INSTALL_FAILED_USER_RESTRICTED` | Xiaomi (HyperOS) blocks installs over USB. | Developer options, **Install via USB**, and confirm on the phone each time. |
| `adb install`: `INSTALL_FAILED_TEST_ONLY` | You built with the single-ABI shortcut `-Pandroid.injected.build.abi=…`, which marks the APK test-only. | Never use it for a release build. |
| `adb install`: `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | The installed app has a different signature. | Uninstall it first (this erases the device key), install, register again. |
| The phone is not listed by `adb devices` | USB debugging is off, or the cable only charges. | Turn on USB debugging, use a data cable, accept the prompt on the phone. |
| Low disk space | Gradle caches and build outputs. | Keep at least 30 GB free; no emulator is needed. |

## The backend

| Problem | Cause | Fix |
|---|---|---|
| Scaleway rejects the zip: *error during build preparation phase* | The archive is not a real zip (Git Bash's GNU `tar` writes a tar archive). | Use `npm run package`, which writes a true zip on every system. |
| An unsigned `POST /v1/ping` gives `404`, not `401` | The handler path is wrong. | The function's handler must be `dist/handler.handle`. |
| `register-device.mjs`: *Set KB_FUNCTION_ID…* | The environment variable is missing. | `scw function function list`, copy the ID, set `KB_FUNCTION_ID`. |
| `register-device.mjs`: command not found | The Scaleway CLI has another name. | Set `SCW_CLI` (`scaleway-cli` is the winget name on Windows, `scw` elsewhere). |
| The function stays `pending` after a deploy | It restarts. | Wait 20 to 60 seconds; if it ends as `error`, read its logs in the console. |
| No Telegram alerts | The two secrets are missing or wrong, the bot has never been messaged, or the same alert was sent in the last 15 minutes. | Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` on the namespace, write to the bot once, and wait. Only four events send alerts: unregistered device, replay, daily limit, provider limit. |
| The first request after a pause is slow | Cold start. | **Warm up** before you write. |

## Things that look like bugs and are not

- **A browser has no online features.** Browsers are not on the allowed list, on purpose.
- **A selection is ignored in a messaging app.** There, the whole message is the text.
- **A copied code or key shows as `••••••` and vanishes after 60 seconds.** That is the sensitive-clipboard rule. The same applies to the public key you copy from the settings: paste it within a minute.
- **Dictation looks formatted although automatic formatting is off.** The dictation model writes punctuation and capitals itself. *Formatting…* on screen and the *Formatted · Undo* strip are the signs of the real thing.
- **Update from FUTO missing.** Not automatic; see the fork's `UPSTREAM.md`.

Still stuck? Open an issue with the exact message and what you did, using an invented example sentence: [CONTRIBUTING.md](../../CONTRIBUTING.md). Never paste your own text, your backend address or your keys.
