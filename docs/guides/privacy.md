# Privacy

Privacy is the reason this project exists, and the reason for most of its design. This page says exactly what leaves your phone, when, and where it goes; which rules are written into the code; what the project does **not** protect you from; and what is not mine to promise.

There is no service run by this project. You deploy your own function with your own accounts, so **I never see your text**, and there is no telemetry, no analytics and no account to create with me.

## What leaves the phone

| What | Leaves the phone? | Where to, and when |
|---|---|---|
| Keystrokes, swipe, autocorrect, the words the keyboard learns | **No** | They stay on the phone. Learning only happens in the allowed apps. |
| Your voice | **No** | Speech-to-text runs on the phone with FUTO's offline models. |
| The text of an online action (Corriger, Améliorer, Traduire, Format) | **Yes** | To **your function**, which passes it to **your LLM provider**. Only when you tap. |
| Dictated text, for automatic formatting | **Yes**, if you turn it on | Same path. **Off by default**; the only request made without a tap. |
| *Warm up* and *Test connection* | a signed request with **no text** | To your function, when you tap. |
| The public device key | only if you copy or share it | It is public, not secret. |
| Alerts | fixed sentences, **never your text** | From your function to Telegram, on four events: an unregistered device, a replayed request, the daily limit, the provider's limit. |
| A crash report | only if you turned on *Offer to email crash reports to FUTO* (**off by default**), the app crashed, **and you accept** the dialog | Inherited from FUTO Keyboard: it opens an email to FUTO's address with the report attached. FUTO does not support this modified version. The report holds a stack trace, device data and the keyboard's settings values, not what you typed. Release builds strip the app's log calls. With the switch off, a crash opens no dialog at all. |
| The clipboard | **No** | The history lives in memory only. |
| Dictionaries and voice models | **No** | The app downloads nothing. You download them in your browser and import them. |

## The rules written into the code

These are not settings. Changing one means editing the code, rebuilding and signing again ([customise](customize.md#hard-coded-on-purpose)).

1. **Only allowed apps.** Online features and learning work only in a fixed list of messaging, social, email, chatbot and document apps ([the list](customize.md#the-allowed-apps)). In every other app, and in every browser, the keyboard types normally and learns and sends nothing. An unknown app counts as not allowed.
2. **Some places are always blocked, even inside allowed apps.** Password, PIN, number, phone and date fields; fields marked incognito; password managers and authenticator apps, by name and by a pattern on the package name. The block is total: no online action, no learning, and what you copy there is treated as sensitive.
3. **A contaminated field stays offline.** If you paste something sensitive from the keyboard's clipboard into a field, online features stay off in that field while it contains that text. The app keeps only a keyed fingerprint of the pasted text (the key is random and lives until the process ends), never the text.
4. **Nothing is stored.** No cloud backup and no device-to-device transfer of the app's data. No logging of what you type: the app's log calls are stripped from release builds. A clipboard history in memory only, text only; images and screenshots are ignored. Sensitive clipboard items (codes, keys, anything copied in a blocked place) are masked and erased after **60 seconds**. The only typed text that reaches the disk is FUTO's learning dictionary (the words you use), and only in allowed apps.
5. **One address, HTTPS only, no surprises.** All network code is one small client that talks to the single address compiled into the app, over HTTPS, without following redirects. There is no request without a tap, except the optional dictation formatting, and no background connection checks.

On top of that, before every request the phone checks the text for **payment cards** (with the Luhn check), **IBANs** (with the mod-97 check), **secrets and API keys** (known prefixes and random-looking strings), **tax and national ID numbers** (seven countries), **one-time codes**, **emails** and **phone numbers**, and applies your rule for each: block, ask, or ignore. Only the kind is ever shown, never the value.

## On your function

- It stores nothing between runs. The counters and the replay protection live in memory.
- Its logs hold one line per request: the event, the path, the status, the error code, the duration and the number of characters. **Never** the text, the answer, or the provider's error bodies (which could repeat your text). A test checks that no console output contains the text.
- Alerts are fixed sentences.
- Scaleway hosts it, in France. Its log lines go to Scaleway's log service; they contain only that metadata.

## At your LLM provider

The provider sees every text you send. The two controls that matter are **training on your data** and **retention**. Turn training off, and read the retention terms for your plan. Mistral keeps each text and its answer for 30 days to monitor abuse, unless you obtain Zero Data Retention. [Choose your LLM provider](choose-your-llm-provider.md#mistral-and-training) has the steps for Mistral, Mistral's own wording, and a checklist for any other provider. Your function sends the provider only the text and a fixed set of options: not your device key, not your phone's identity and not the name of the app you are in. The provider knows your account, because of the API key, but not which phone or app a text came from.

## What this does not protect you from

- **The provider reads what you send.** The sensitive-data check is a safety net built from patterns and checksums. It does not recognise a password you made up from words, or personal details such as names, addresses or health information, or a tax or national ID number in a format it does not know (it knows those of seven countries, listed in [customise](customize.md#sensitive-data)). Do not send what you would not hand to the provider.
- **Other people's messages.** A message about someone else is still text sent to the provider. You decide.
- **A phone that is rooted or controlled by someone else.** The integrity checks and the hardware-bound key make tampering visible and block most of it, but nothing is guaranteed against an attacker who controls the device. See the [security model](security-model.md).
- **Anything outside this project.** The apps you type in, FUTO's code and the services below.

## What is not mine

> [!IMPORTANT]
> The keyboard engine (typing, swipe, autocorrect), the **speech-to-text models**, the learning dictionary, the crash-report mechanism and the **payment screens** come from FUTO Keyboard. I did not write, train or audit them, I do not maintain them, and **I take no responsibility for them**. They are provided as they are, under FUTO's licence and terms. When the network permission was added, the fork's code was reviewed and the only network code left is the client for your backend; but FUTO's code is FUTO's.
>
> The same goes for the services you choose: your LLM provider, Scaleway, Telegram, and the apps you type in. Their terms apply to you, not to me.

The FUTO payment screens stay in the app because FUTO's licence requires it. Anything paid there goes to FUTO; I receive no share. A card at the top of the payment screen says exactly that, and who made this version.

## Your part

- Set the provider's **spend cap**, and keep the key in the provider's console and your password manager only: never in a chat, in a shell command or in a file that git tracks.
- Turn **training off** at the provider, and check again after terms change.
- Keep the **keystore and its password** safe, and the Scaleway API key short-lived.
- Set up the **Telegram alerts**: they are how you learn that something is wrong.
- Never paste your own text, your backend address or your keys in a public issue. A possible leak goes through [private reporting](../../SECURITY.md).
