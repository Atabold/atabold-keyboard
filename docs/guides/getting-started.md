# Install guide

Everything you do to get Atabold Keyboard working on your phone, with your own backend. Prefer to let an AI agent drive? Use [INSTALL_WITH_AI.md](../../INSTALL_WITH_AI.md); it follows the same steps.

**Why you build the app yourself.** The address of your backend and the fingerprint of your signing certificate are compiled into the app, and your phone is registered on your backend by hand. That is deliberate: nobody can point your keyboard at another server, and a modified or re-signed copy of the app cannot talk to your backend. The price is this guide. Plan about an hour of work and a build of 10 to 20 minutes.

You will end up with:

- a Mistral workspace (or another provider) with a hard monthly spend cap,
- a small function on Scaleway that only your phone can call,
- an APK signed with your own key, installed on your phone,
- optionally, Telegram alerts when something unexpected happens.

## 0. What you need

| | |
|---|---|
| Phone | Android 7.0 or newer, with a hardware-backed Keystore (almost every phone since 2016). A locked bootloader is recommended. Tested on one phone only: a Xiaomi on Android 16. |
| Computer | Windows, macOS or Linux, about 30 GB of free disk space, no spaces in the project path. |
| Tools | `git` with `git-lfs`; Node.js 24 or newer; JDK **17** (what the project is built with; Gradle 8.14 does not work with JDK 25); Python 3; the Android SDK with platform 35, build-tools 35.0.0, NDK 28.2.13676358, CMake 3.22.1 and platform-tools (`adb`); the Scaleway CLI (`scw`; on Windows the winget package installs it as `scaleway-cli`); `zip` on macOS and Linux. |
| Accounts | Mistral (or another provider, see [choose your LLM provider](choose-your-llm-provider.md)) and Scaleway, both with two-factor authentication. Telegram is optional. |
| Money | Scaleway Functions has a monthly free quota that a single user does not come close to; check their current pricing. The LLM costs a few cents a month for normal use, and you set the ceiling in step 1. |

Install the Android SDK parts with Android Studio's SDK Manager, or with `sdkmanager "platforms;android-35" "build-tools;35.0.0" "ndk;28.2.13676358" "cmake;3.22.1" "platform-tools"`.

## 1. The LLM provider: a dedicated workspace with a hard cap

The cap is your main protection against a stolen API key: when it is reached the provider refuses further calls. An alert is not a cap; choose a provider and plan that stop.

With Mistral:

1. Create a **new workspace** just for this project.
2. Set a **monthly spend limit** on it (the spec uses a small amount, in your billing currency).
3. Create an API key **inside that workspace** only. Keep it in your password manager; you will paste it into the Scaleway console in step 4, never into a command line or a chat.
4. **Turn off training on your data** before your first request: in the admin console, **Privacy**, switch off "Allow the use of your API calls to train Mistral's AI models". Mistral still keeps what you send for 30 days to monitor abuse; details: [choose your LLM provider](choose-your-llm-provider.md#mistral-and-training).

## 2. Scaleway: a project, and access that can only touch it

1. Create a Scaleway **project** just for this (for example `keyboard`) and switch on two-factor authentication on the account.
2. In IAM, create an **application** with a single policy, `FunctionsFullAccess`, limited to that project, and an **API key with an expiry date**.
3. Configure the CLI with that key. It asks for the keys itself, so they stay out of your shell history:

   ```sh
   scw init project-id=<project-id> with-ssh-key=false send-telemetry=false install-autocomplete=false region=fr-par zone=fr-par-1
   ```

   Passing `project-id` matters: without it, `init` tries to list projects and fails with "insufficient permissions".
4. In Billing, add a **spend alert** (for example 1 euro).

## 3. Telegram alerts (optional, recommended)

The function can tell you, on a channel independent of the keyboard, when a request comes from an unregistered device, when a request is replayed, and when a limit is reached. The messages are fixed texts and never contain your text.

1. In Telegram, talk to `@BotFather`, send `/newbot`, and keep the token.
2. Send any message to your new bot, then find your chat id (the `getUpdates` method of the Telegram Bot API shows it; do this in your browser, not in a chat with an AI agent).
3. You will store `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as secrets in step 4. Without them, alerts are simply skipped.

## 4. Deploy the backend

From the `backend/` folder of this repository:

```sh
npm ci
npm test            # 40 tests, no network needed
npm run package     # builds function.zip (needs `zip` on macOS and Linux)
```

Create a namespace and the function once. Replace the placeholders; the function name `kb` is the one the docs use:

```sh
scw function namespace create name=<namespace-name> project-id=<project-id>
# note the namespace id it prints

scw function function create namespace-id=<namespace-id> name=kb runtime=node24 \
  handler=dist/handler.handle privacy=public http-option=redirected \
  min-scale=0 max-scale=1 memory-limit=128 timeout=30s
```

`privacy=public` is needed because the phone calls it without a Scaleway token; every request is rejected unless it carries a valid signature from your registered phone. `max-scale=1` caps the cost. `min-scale=0` means the function sleeps when idle, which is why the first request after a pause takes a few seconds ([Warm up](using-the-keyboard.md#warm-up) exists for that).

Now the secrets. Put them in the **namespace** settings of the Scaleway **console**, as secret environment variables: `MISTRAL_API_KEY`, and `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` if you use alerts. Do not pass them on a command line. (The phone's key, `DEVICE_PUBLIC_KEY_SPKI`, is set later by a script, at function level.)

Optional values, as plain environment variables if you want something other than the defaults in the code: `MODEL_FAST` (`mistral-small-latest`), `MODEL_ACCURATE` (`mistral-medium-latest`), `RATE_PER_MINUTE` (20), `DAILY_CAP` (300), `MAX_CHARS` (4000).

Deploy the code and wait until the function is `ready`:

```sh
scw function deploy namespace-id=<namespace-id> name=kb runtime=node24 zip-file=function.zip
scw function function list      # note the function's domain name (its URL is https:// followed by it) and its id
```

Check it. A request without a signature must be refused, and an unknown path must say nothing:

```sh
curl -i -X POST https://<your-function-url>/v1/ping    # expect 401 {"error":"unauthorized"}
curl -i https://<your-function-url>/nothing            # expect 404 with an empty body
```

If you set up Telegram, the first request also sends you the "unregistered device" alert (at most one per type every 15 minutes).

Keep the function id in your shell for step 8: `export KB_FUNCTION_ID=<function-id>` (PowerShell: `$env:KB_FUNCTION_ID = "<function-id>"`).

## 5. Your signing key and the build settings

You sign the APK yourself, and the app checks at start-up that it was signed with your certificate.

1. Create a keystore **outside the project folders**, and choose a password you keep only in your password manager:

   ```sh
   keytool -genkeypair -v -keystore kbfr-release.jks -alias kbfr -keyalg RSA -keysize 4096 -validity 10000
   ```
2. Print its certificate fingerprint and copy the `SHA256:` line:

   ```sh
   keytool -list -v -keystore kbfr-release.jks -alias kbfr
   ```
3. Back the keystore up (encrypted). If you lose it, you cannot update the app in place: you would have to uninstall it, which erases the device key, and register the phone again.

## 6. Build the app

```sh
# once, from the root of this repository
git lfs install
git clone --recursive https://github.com/Atabold/atabold-keyboard-android.git android
cd android
```

`--recursive` is required (the app has 7 submodules; the download is about 1.1 GB). Copy `kbfr.properties.example` to `kbfr.properties` and fill in the two values you now have, plus your two language choices:

```properties
endpoint=https://<your-function-url>
expectedCertSha256=<the SHA256 line from step 5, colons allowed>
# your language, for the explanations of the corrections: en, fr, de, es or it (en if you leave it out)
explainIn=en
# the language Translate writes by default: fr, en, de, es or it (fr if you leave it out)
translateTo=fr
```

The two language lines only set the first-run defaults of *Language of the explanations* and *Translate into*: you can change both later in the settings, without rebuilding. The file is git-ignored. Keep it that way: it holds your address. Then, with JDK 17 first on the path (`JAVA_HOME`) and the SDK location in `ANDROID_HOME`:

```sh
export VERSION_CODE=1 VERSION_NAME=0.1.0     # PowerShell: $env:VERSION_CODE = 1
./gradlew assembleStableRelease              # Windows: .\gradlew.bat assembleStableRelease
```

Set `VERSION_CODE` to a higher number for every new build you install over an old one. Without these two variables the build asks `git`, and falls back to version code -1 when the clone has no local `master` branch.

The build stops with an explanation if `kbfr.properties` is missing or incomplete. The first build takes 10 to 20 minutes (mostly native code). Gradle then leaves `build/outputs/apk/stable/release/android-stable-release.apk`, which is signed with a **public** key from the FUTO repository. **Never install that file.** Sign it with your own key, by hand, so the password never sits in a file:

```sh
<sdk>/build-tools/35.0.0/apksigner sign --ks <keys>/kbfr-release.jks --ks-key-alias kbfr \
  --out atabold-keyboard.apk build/outputs/apk/stable/release/android-stable-release.apk
<sdk>/build-tools/35.0.0/apksigner verify --print-certs atabold-keyboard.apk
```

`apksigner` asks for the password. `verify` must show **exactly one signer**, with the SHA-256 you put in `kbfr.properties`. If it does not, stop: the app would report "Integrity compromised: different APK signature" and keep every online feature off.

## 7. Install and set up the keyboard

```sh
adb install -r atabold-keyboard.apk
```

Some phones need a setting first: on Xiaomi, turn on **Install via USB** in Developer options, then confirm each install on the phone. Then open the app (it is called **Clavier Atabold** on the phone) and follow its setup (enable the keyboard, select it).

The app ships with the English dictionary only, and FUTO's keyboard does not download anything by itself. For each language you type in, open the keyboard's settings, Languages, the language, **Explore dictionaries** (it opens FUTO's list), download the compiled `.dict` file, and use **Import dictionary or model**. Dictionaries for French, German, Spanish, Italian and many other languages are on FUTO's list. For offline dictation, import a voice model the same way; **Multilingual-244** covers French and many other languages, among them English, German, Spanish and Italian (the 74 model is French only).

The actions (Corriger, Améliorer, Traduire, Format, Warm up, Online) appear in the keyboard's *All Actions* list. [Put the ones you use on the toolbar](using-the-keyboard.md#put-the-actions-on-your-toolbar) so that they are one tap away.

## 8. Register your phone

1. In the keyboard's settings open **Correction & privacy**. The page shows the backend address read-only and the device key: its id, and where it is stored (secure hardware).
2. Tap **Copy public key** (or **Share public key** to send it to your computer). The public key is not secret.
3. On the computer, from the root of this repository, with the Scaleway CLI configured and `KB_FUNCTION_ID` set:

   ```sh
   node tools/register-device.mjs "<the public key>"
   ```

   The script checks that it is an EC P-256 key, prints the key id (it must match the one in the app), stores it as the function's `DEVICE_PUBLIC_KEY_SPKI` secret and redeploys. That takes 20 to 60 seconds. Only one phone can be registered at a time; a new key replaces the old one.
4. In the app, tap **Test connection**. It must say *Registered: the backend accepts this phone*.

## 9. Check that it works

1. In an allowed app (for example a notes app or a messaging app), type: `Je suis allé à la université hier pour retrouver mon friend`.
2. Tap **Corriger**. After a moment the panel shows two changes: the elision (*à la université* becomes *à l'université*) and the English word translated (*friend* becomes *ami*).
3. Tap **Insert**. The strip *Corrected · Undo* appears above the toolbar. Tap **Undo** to restore the original.
4. In a browser or in a password field the online actions are dimmed with a lock; tapping one says why.
5. In airplane mode, typing works as usual and an action says the backend is unreachable.

If something is off, see [troubleshooting](troubleshooting.md).

## 10. Updating

| What changed | What to do |
|---|---|
| A prompt, a model, a limit | `npm test`, `npm run package`, `scw function deploy ...` (step 4). Run the [prompt evaluation](customize.md#prompts-and-the-evaluation) first for a prompt. No new APK. |
| The app (settings, allowed apps, anything in `android/`) | Rebuild, sign and `adb install -r` with a higher `VERSION_CODE`. Your key and registration survive an update signed with the same key. |
| A new release of this project | Read the [changelog](../../CHANGELOG.md): it says whether the backend, the app or both need updating, and in which order (deploy the backend first when the request format changes). |
| FUTO publishes a fix | Not automatic. See the fork's `UPSTREAM.md`. |
| Your keystore or its password may have leaked | Changing the password is not enough: whoever copied the file can still use the key. Make a new keystore (step 5), put its fingerprint in `kbfr.properties`, rebuild and sign (step 6), uninstall the old app (a different signature cannot update it, and uninstalling erases the device key), install the new one and register the phone again (step 8). |
