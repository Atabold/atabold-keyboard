# Customise it

Three levels, from the easiest to the most involved. Pick the lowest one that does what you want.

| Level | You change | Then you must | Typical changes |
|---|---|---|---|
| **1. In the app** | the *Correction & privacy* settings | nothing | language of the explanations, tu/vous, speed profile, how text is inserted, sensitive-data rules, confirmations, Wi-Fi only, dictation formatting |
| **2. On your function** | environment variables and prompt files in `backend/` | redeploy the function; no new APK | models, limits, prompts, alerts |
| **3. In the app's code** | source files in the Android repository | rebuild, sign and reinstall | the allowed apps, the blocked apps, the sensitive-data patterns, names, interface languages |

Another language pair is a bigger job and has its own page: [adapt it to your language](adapt-to-your-language.md). Another LLM provider too: [choose your LLM provider](choose-your-llm-provider.md).

## Level 1: the settings

Open the keyboard's settings, *Correction & privacy*. Values in **bold** are the defaults.

| Section | Setting | Values |
|---|---|---|
| Connection | Backend URL | read-only: it is compiled into the app |
| | Device key | shows its id and where it is stored; copy or share the public key; regenerate (the backend then rejects the phone until you register the new key) |
| | Timeout | 5 to 30 seconds, **20** |
| | Wi-Fi only | on, **off** |
| | Test connection | signed ping: *Registered* or *Not registered* |
| Privacy | Online features | **on**, off (also the *Online* action on the toolbar) |
| | Offer to email crash reports to FUTO | on, **off** (release builds; with it off a crash opens no dialog) |
| | Character limit per request | 100 to 4,000, **4,000** |
| | Confirm before sending | **never**, always, above a number of characters (100 to 4,000, **1,000**) |
| | Sensitive data | per kind: block, ask or ignore. Defaults: payment card **block**, IBAN **block**, secret or API key **block**, tax or national ID **ask**, one-time code **ask**, email **ignore**, phone number **ignore** |
| | Allowed and blocked apps | read-only lists |
| Corriger / Améliorer | Language of the explanations | **English**, Français, Deutsch, Español, Italiano. *The first-run default is the `explainIn` you set in `kbfr.properties` when you built the app (English if you left it out).* |
| | Language of the result | **the main language of the text**, always French |
| | Translate words in other languages | **on**, off |
| | Form of address | **as I wrote it**, tu, vous |
| | Explanations | **short**, detailed with the rule |
| | Profile | **fast**, accurate (the function decides which model each profile means) |
| | Harmonise American / British English | on, **off** (off: you get a note instead of a change) |
| | Insertion | **show the changes**, replace at once (with Undo) |
| Traduire | Translate into | **Français**, English, Deutsch, Español, Italiano. *The first-run default is `translateTo` in `kbfr.properties` (French if you left it out).* |
| Voice / Format | Format dictation automatically | on, **off** |
| | Style | minimal, **clean** |
| | Also fix grammar | on, **off** |
| Clipboard | History duration | FUTO's slider, 1 to 336 hours, default 1 hour; always memory only. Sensitive items: fixed 60 seconds |

## Level 2: your function

### Models, limits, alerts

These are environment variables of the function. Plain ones go in *environment variables*, the others in *secrets*; change them in the Scaleway console (or with `scw function function update`), then redeploy.

| Variable | Kind | Default | What it does |
|---|---|---|---|
| `MODEL_FAST` | plain | `mistral-small-latest` | the model behind the *fast* profile |
| `MODEL_ACCURATE` | plain | `mistral-medium-latest` | the model behind the *accurate* profile |
| `RATE_PER_MINUTE` | plain | 20 | requests per minute (`/v1/kb` only) |
| `DAILY_CAP` | plain | 300 | requests per UTC day (`/v1/kb` only); reaching it sends an alert |
| `MAX_CHARS` | plain | 4000 | longest text accepted; the app's own limit slider stops at 4,000 |
| `MISTRAL_API_KEY` | secret | – | the provider key (namespace level) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | secret | – | without them alerts are skipped |
| `DEVICE_PUBLIC_KEY_SPKI` | secret | – | your phone's public key; set by `tools/register-device.mjs`, not by hand |

The phone cannot choose a model, only a profile: a compromised phone must not be able to pick an expensive one. The counters live in memory and reset on a cold start, so the provider's spend cap is the real ceiling.

### Prompts and the evaluation

The prompts are the four files in [backend/prompts/](../../backend/prompts/): `correct`, `improve`, `translate`, `format`. The app sends only fixed options; everything else the model is told is in these files.

Never ship a prompt change without running the evaluation: [eval/cases.jsonl](../../eval/cases.jsonl) holds 39 test sentences, and [eval/run.mjs](../../eval/run.mjs) runs them through both profiles. Each case lists what must hold: `contains`, `not_contains`, `unchanged`, `edits_empty`, `category`, or a `note` (a US/UK notice). Run it against a local copy of your function so your phone stays registered:

```sh
cd backend
node ../tools/kb.mjs keygen              # once: a development key, in tools/.dev-key.pem (git-ignored)
node ../tools/kb.mjs pubkey              # prints DEVICE_PUBLIC_KEY_SPKI for the local server
# set DEVICE_PUBLIC_KEY_SPKI to that value and type MISTRAL_API_KEY yourself (for example with Read-Host in PowerShell)
npm run serve                            # http://localhost:8080; reads the prompts at start, so restart after every change
# in a second terminal, from the repository root:
node eval/run.mjs http://localhost:8080
```

It sends one request every 3.1 seconds (about three and a half minutes for both profiles), prints each failure with the model's answer, the share of valid JSON and the median latency. The bar used so far: valid JSON in every case, already-correct texts unchanged, median latency under 3 seconds on the fast profile. Add a case for every mistake you want to be sure about.

> [!NOTE]
> For this release the four prompts were reworded to be language-neutral, and cases were added for English speakers (`en-*`) and for German and Spanish (`de-*`, `es-*`). The whole evaluation was run with the new wording: valid JSON in every case, 35 of 39 checks passed on `fast` and 36 on `accurate`, median latency under one second. `fast` misses the bar on one already-correct text: it turns "je te réponds demain" into a future tense. Both profiles keep *librairie* where *bibliothèque* is meant. The other misses are labels and notes; all are listed in the [backend notes](../architecture/backend.md#prompt-evaluation).

## Level 3: the app's code

### The allowed apps

Online features and learning work **only** in the apps listed in `ALLOWED_APPS`, in [PrivacyPolicy.kt](https://github.com/Atabold/atabold-keyboard-android/blob/main/java/src/org/futo/inputmethod/latin/kbfr/PrivacyPolicy.kt). The category decides which text the actions use: email and document apps work on the selection if there is one, everything else on the whole field. These are the apps in the first release: well-known apps of the five categories, with the package names taken from the Play Store addresses of the apps (the `id=` in the address). It is a starting list, not a recommendation: shorten it or add your own.

| Category | Apps (package names) |
|---|---|
| Messaging | WhatsApp and Business (`com.whatsapp`, `com.whatsapp.w4b`), Telegram (`org.telegram.messenger`, `org.telegram.messenger.web`), Signal (`org.thoughtcrime.securesms`), Google Messages (`com.google.android.apps.messaging`), Google Chat (`com.google.android.apps.dynamite`), Messenger (`com.facebook.orca`), Discord (`com.discord`), Slack (`com.Slack`), Microsoft Teams (`com.microsoft.teams`), Viber (`com.viber.voip`), Threema and Threema Work (`ch.threema.app`, `ch.threema.app.work`), Element Classic and Element X (`im.vector.app`, `io.element.android.x`), Wire (`com.wire`), Olvid (`io.olvid.messenger`), Nextcloud Talk (`com.nextcloud.talk2`), Conversations (`eu.siacs.conversations`), Briar (`org.briarproject.briar.android`), Tchap (`fr.gouv.tchap.a`) |
| Social | Instagram (`com.instagram.android`), Facebook (`com.facebook.katana`), Threads (`com.instagram.barcelona`), X (`com.twitter.android`), LinkedIn (`com.linkedin.android`), Reddit (`com.reddit.frontpage`), Snapchat (`com.snapchat.android`), TikTok (`com.zhiliaoapp.musically`), Pinterest (`com.pinterest`), Mastodon (`org.joinmastodon.android`), Tusky (`com.keylesspalace.tusky`), Bluesky (`xyz.blueskyweb.app`), Tumblr (`com.tumblr`), XING (`com.xing.android`), BeReal (`com.bereal.ft`) |
| Email (selection) | Gmail (`com.google.android.gm`), Outlook (`com.microsoft.office.outlook`), Proton Mail (`ch.protonmail.android`), Yahoo Mail (`com.yahoo.mobile.client.android.mail`), Thunderbird (`net.thunderbird.android`), K-9 Mail (`com.fsck.k9`), FairEmail (`eu.faircode.email`), Tuta Mail (`de.tutao.tutanota`), Spark (`com.readdle.spark`), Samsung Email (`com.samsung.android.email.provider`), GMX Mail (`de.gmx.mobile.android.mail`), WEB.DE Mail (`de.web.mobile.android.mail`) |
| Chatbots | Claude (`com.anthropic.claude`), ChatGPT (`com.openai.chatgpt`), Gemini (`com.google.android.apps.bard`), Vibe by Mistral, formerly Le Chat (`ai.mistral.chat`), Perplexity (`ai.perplexity.app.android`), DeepSeek (`com.deepseek.chat`), Grok (`ai.x.grok`), Lumo by Proton (`me.proton.android.lumo`) |
| Documents (selection) | Google Docs (`com.google.android.apps.docs.editors.docs`), Microsoft Word (`com.microsoft.office.word`), Notion (`notion.id`), Google Keep (`com.google.android.keep`), OneNote (`com.microsoft.office.onenote`), Evernote (`com.evernote`), Obsidian (`md.obsidian`), Simplenote (`com.automattic.simplenote`), Joplin (`net.cozic.joplin`), Samsung Notes (`com.samsung.android.app.notes`), Nextcloud Notes (`it.niedermann.owncloud.notes`), ONLYOFFICE Documents (`com.onlyoffice.documents`), Collabora Office (`com.collabora.libreoffice`), Anytype (`io.anytype.app`), Capacities (`io.capacities.mobile`) |

**Browsers are deliberately not on the list.** A website cannot be told apart from another, so allowing a browser would allow online features on every page, banking included. In a browser the keyboard types normally and sends nothing.

To add an app:

1. Find its package name: `adb shell pm list packages | grep <part of the name>` (PowerShell: `| Select-String`), or the `id=` in its Play Store address.
2. Add one line to `ALLOWED_APPS` with the right category, for example `"com.example.chat" to AppCategory.MESSAGING`.
3. Run `./gradlew testUnstableDebugUnitTest --tests "org.futo.inputmethod.latin.kbfr.*"`. One test checks that no allowed app matches the blocked-name pattern.
4. Rebuild, sign and install ([install guide, step 6](getting-started.md#6-build-the-app)). The settings list is read-only and shows the new app.

Always blocked, whatever the list says: the password managers and authenticators listed by name in `ALWAYS_BLOCKED_APPS` (Proton Pass and Authenticator, Google Authenticator, Microsoft Authenticator, Authy, Aegis, 2FAS, Bitwarden, 1Password, KeePassDX, Keepass2Android, LastPass, Dashlane, Keeper, Enpass, RoboForm, Duo Mobile, Okta Verify, Yubico Authenticator, Ente Auth, Stratum and FreeOTP), and any app whose package name contains `authenticator`, `authy`, `otp`, `2fa`, `totp`, `keepass`, `bitwarden`, `1password`, `lastpass`, `dashlane`, `password` or `vault`. If an app is on both lists, the block wins.

### Sensitive data

The patterns and checksums (Luhn for cards, mod-97 for IBANs, the check digits of the national ID numbers, the known key prefixes, the random-looking-string rule) are in `SensitiveData.kt` with their tests in `SensitiveDataTest.kt`; the clipboard heuristic is in `ClipboardSensitivity.kt`. The tax and national ID numbers it recognises are those of France (social security number), Germany (tax ID), Italy, Spain (DNI and NIE), Switzerland (AHV), the United Kingdom (National Insurance) and the United States (Social Security); to add a country, add a pattern and its check to `NATIONAL_IDS`, and a test. The settings only choose block, ask or ignore per kind. The 60 seconds of a sensitive clip are fixed on purpose.

### Names, notices and languages of the interface

The app's name is in `java/res/values/strings-appname.xml` (and the `unstable` copy), the same in every language: the build leaves out FUTO's translated names (`translationsWithoutEngValues` in `build.gradle`). The icon is the letter é (`java/res/drawable/ic_launcher_foreground.xml`) on a light card (`ic_launcher_card.xml`) on a blue field (`ic_launcher_background.xml`), with the three colours in `java/res/values/ic_launcher_background.xml` (the dev build overrides them in `java/unstable/res/values/`). The strings of this project's features are in `java/res/values/kbfr-strings.xml` (English) and `java/res/values-it/kbfr-strings.xml` (Italian); a new interface language is a new `values-xx/kbfr-strings.xml`. The *About this fork* text must stay: the FUTO licence requires a notice that the software was modified.

## Hard-coded on purpose

These are not settings, so that nobody can switch them off by accident, by a settings backup, or on a stolen unlocked phone. Changing them means editing the code, rebuilding and signing again, and you take over the consequences.

- which apps may send text, and which may never;
- password, PIN, number, phone and date fields, and incognito fields, always blocked;
- the backend address and the signing-certificate check;
- text is never written to disk, to logs or to backups, and the clipboard history never leaves memory;
- the 60 seconds of sensitive clips;
- no request without a tap, except the optional dictation formatting.

Why each one exists: [privacy](privacy.md) and [security model](security-model.md).
