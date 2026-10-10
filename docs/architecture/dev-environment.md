# Development environment

One working setup: Windows 11 with Git Bash, and Android Studio for its SDK. This is a record of what worked, not a requirement. The step-by-step guide for anyone is [the install guide](../guides/getting-started.md). In this document "the user" is the project's author.

## Installed

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24.19.0 | `winget` package `OpenJS.NodeJS.LTS`. Same major as the Scaleway `node24` runtime. |
| git | 2.47.1 | Git for Windows, with git-lfs 3.6.1. Windows long paths are enabled (`LongPathsEnabled=1`). |
| GitHub CLI | 2.96.0 | Optional: for creating the repositories. |
| JDK | Amazon Corretto 17 | `JAVA_HOME`. Android Studio ships its own JDK (JBR 25) for Gradle. |
| WSL2 | 2.5.7 | Fallback for the FUTO native build (spec 9). |
| Android Studio | 2026.1.4.7 | `winget` package `Google.AndroidStudio`, in `C:\Program Files\Android\Android Studio`. |
| Android SDK | — | `%LOCALAPPDATA%\Android\Sdk`, also set as the user variable `ANDROID_HOME`; `platform-tools` is on the user `PATH`. Packages: `platforms/android-35`, `build-tools/35.0.0`, `ndk/28.2.13676358`, `cmake/3.22.1`, `platform-tools` 37.0.1 (`adb`), `cmdline-tools/latest` 23.0. No emulator. |

The SDK was installed from the command line, not from the Android Studio wizard. Since cmdline-tools 23, `sdkmanager` is deprecated and wraps the new Android CLI; from Git Bash its `;` package names get split, so use the new syntax instead:

```sh
"$LOCALAPPDATA/Android/Sdk/cmdline-tools/latest/bin/android.exe" --sdk="$LOCALAPPDATA/Android/Sdk" sdk install ndk/28.2.13676358
```

| Scaleway CLI | 2.60.0 | `winget` package `Scaleway.cli`. The command is **`scaleway-cli`**, not `scw` (winget alias). Configured with `scaleway-cli init project-id=<project id> with-ssh-key=false send-telemetry=false install-autocomplete=false region=fr-par zone=fr-par-1`, which prompts for the keys. The API key belongs to an IAM application with only `FunctionsFullAccess` on the keyboard's project only, with an expiry date. Passing `project-id` matters: without it, `init` lists projects and fails with "insufficient permissions: read project". |

## FUTO build requirements

Read from `github.com/futo-org/android-keyboard` (master) at the base commit:

- `compileSdk 35`, `targetSdk 35`, `minSdk 24`;
- `ndkVersion '28.2.13676358'`, native code built with CMake from `native/jni/CMakeLists.txt`;
- Gradle wrapper 8.14.3;
- product flavors `unstable`, `stable`, `playstore`; reference build `./gradlew assembleUnstableDebug`;
- `applicationId 'org.futo.inputmethod.latin'` (the fork changes it, spec 9);
- 7 git submodules (`libs`, voice models, layouts, translations, themes, large resources, `futo-swipe`), so clone with `--recursive`. `futo-swipe` is hosted on Hugging Face, which stores files with git-lfs. No symlinks in the main repository.

## FUTO fork clone (`android/`)

- Cloned with `--recursive` from the fork's repository, which is based on FUTO's `master` at `70a5d390c` (`https://gitlab.futo.org/keyboard/latinime.git`). About 1.1 GB with submodules; the `futo-swipe` git-lfs files are downloaded, not pointers.
- Its own git repository, ignored by the main one (`/android/` in the root `.gitignore`). Submodule git dirs are relative, so the clone survives moving or renaming the parent folder.
- Branch `main` holds the fork's changes; `master` is FUTO's code at the base commit, unchanged.
- Remotes: `origin` = GitHub repo `Atabold/atabold-keyboard-android`; `upstream` = FUTO GitLab, with its push URL set to `DISABLED-no-push-to-FUTO` because FUTO asks for no pull requests (spec 9).
- `core.longpaths=true` is set in this repository.
- The fork's own changes are listed in [android-fork.md](android-fork.md). About the app ID: the few hardcoded `org.futo.inputmethod.latin` strings in FUTO only detect a Play Store + standalone double install and name a debug broadcast, so they need no change.

## Building the fork

From Git Bash, without Android Studio:

```sh
cd android
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" JAVA_HOME="/c/Program Files/Amazon Corretto/jdk17.0.9_8"
./gradlew assembleUnstableDebug
```

- **Gradle must run on JDK 17.** Android Studio's own JBR 25 is too new for Gradle 8.14.3 (Java 25 needs Gradle 9.1+). In Android Studio set Settings → Build Tools → Gradle → Gradle JDK to Corretto 17.
- **Python** runs before every build (`updateLocales` → `tools/make-keyboard-text-py/src/generate.py`). Python 3.14 is installed. Without UTF-8 mode it failed with `UnicodeDecodeError ... cp1252`, hence the fork's `PYTHONUTF8=1`.
- **Faster dev builds:** add `-Pandroid.injected.build.abi=arm64-v8a` (the phone's ABI) to compile native code for one ABI only; a Java/Kotlin change then builds in about 5 minutes. The property marks the APK `testOnly` and writes it to `build/intermediates/apk/...` instead of `build/outputs/apk/...`, so install it with `adb install -r -t`. **Never use it for release builds**: a test-only release refuses a normal install (`INSTALL_FAILED_TEST_ONLY`).
- The first build took 17 minutes, mostly native code for four ABIs. Output: `build/outputs/apk/unstable/debug/android-unstable-debug.apk`, about 159 MB.
- Flavors map to these app IDs: `unstable` → `org.futo.inputmethod.latin.kbfr.unstable`, label "Clavier Atabold [Dev Build]"; `stable` → `org.futo.inputmethod.latin.kbfr`; `playstore` → `...kbfr.playstore` (not used).
- **Signing.** Debug builds are signed with `java/shared.keystore`, a key that is public in FUTO's repository. A release build without `keystore.properties` silently falls back to the same public key. Only a release build signed with the personal keystore may become the daily keyboard or have its device key registered on the backend (spec 8).
- **Release build:** `./gradlew assembleStableRelease` (11 minutes, R8 on) → `build/outputs/apk/stable/release/android-stable-release.apk`, about 140 MB, label "Clavier Atabold", id `org.futo.inputmethod.latin.kbfr`. The SHA-256 of the signing certificate goes into `android/kbfr.properties` as `expectedCertSha256`, next to the backend URL (`endpoint`); the file is git-ignored and a release build stops while it is missing (spec 8). FUTO's public debug key is `28bbfe4a7b97e74681dc55c2fbb6ccb8d6c74963733f6af6ae74d8c3a6e879fd`. Check with `build-tools/35.0.0/apksigner.bat verify --print-certs <apk>`.
- **Release keystore:** `<your keys folder>\kbfr-release.jks`, alias `kbfr`, outside both repositories. Its password lives only in a password manager. There is no `keystore.properties`, so Gradle cannot sign a release build with your key.
- **Signing by hand.** `assembleStableRelease` therefore falls back to FUTO's public key (see **Signing** above), and you sign every release yourself after the build. `apksigner` asks for the password and strips the old signature:
  ```powershell
  cd <project folder>\android\build\outputs\apk\stable\release
  $bt = "$env:LOCALAPPDATA\Android\Sdk\build-tools\35.0.0"
  & "$bt\apksigner.bat" sign --ks <your keys folder>\kbfr-release.jks --ks-key-alias kbfr --out android-stable-release-signed.apk android-stable-release.apk
  & "$bt\apksigner.bat" verify --print-certs android-stable-release-signed.apk
  ```
  Only an APK whose `verify` shows exactly one signer, with your certificate's SHA-256, may be installed; the `android-stable-release.apk` that Gradle leaves carries FUTO's public key.
- **Rotating the signing key.** If the keystore or its password may have been exposed, changing the password is not enough: anyone who copied the file before can still use the key. Make a new keystore (`keytool -genkeypair ...`), put its fingerprint in `kbfr.properties`, rebuild and sign, uninstall the old app (a different signature cannot update it, and uninstalling erases the device key), install the new one and register the phone again ([install guide](../guides/getting-started.md#8-register-your-phone)).

## Phone

A Xiaomi phone running HyperOS, Android 16, `arm64-v8a`, connected over USB with debugging on. Installed from this project: the release build `org.futo.inputmethod.latin.kbfr` (personal key) and the dev build `org.futo.inputmethod.latin.kbfr.unstable` (FUTO's public debug key). Xiaomi's HyperOS blocks `adb install` (`INSTALL_FAILED_USER_RESTRICTED`) until **Install via USB** is turned on in Developer options, and it asks for confirmation on the phone at every install.

## Constraints

- **Disk space.** Gradle caches and build outputs need many GB: keep at least 30 GB free. No Android emulator: the real phone is used.
- **Spaces in the project path.** NDK and CMake tools on Windows have a history of breaking on paths with spaces, and Android Studio warns about it. So the project folder has no spaces, with the FUTO clone inside it in `android/`.
