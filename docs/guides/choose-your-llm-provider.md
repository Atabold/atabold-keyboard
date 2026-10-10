# Choose your LLM provider

The corrections are made by a language model that your function calls. This project was built and tested with **Mistral**, and that is what the code does today. This page says what a provider must offer, how to use other models or another provider, and what to switch off at Mistral so that your text is not used to train anything.

**The provider sees every text you send.** Choosing one is the single most important privacy decision after "which apps may send text". Read its terms for the plan you actually use, write the date down, and check again now and then.

## What the backend needs

| Need | Why |
|---|---|
| An HTTP chat-completions API shaped like OpenAI's: `POST` with `Authorization: Bearer <key>`, a `model`, `messages`, `max_tokens`, `temperature`, and an answer in `choices[0].message.content` | that is what [mistral.ts](../../backend/src/mistral.ts) sends and reads |
| **Structured output** that follows a JSON schema (`response_format` of type `json_schema`, `strict: true`) | the answer must be machine-readable. The function validates it anyway and retries once, so a weaker JSON mode can work too |
| About one second per answer | the app waits for it; the evaluation measured a median of about 0.8 to 0.9 seconds on Mistral's small and medium models |
| A **hard monthly spend cap**, not just an alert | it is your protection if the key is stolen. The function maps a `429` from the provider to *Provider monthly budget used up* and sends you an alert, so the provider should answer `429` when the cap is hit |
| **Training on your data off**, a short retention, ideally zero-retention on request, and a region you accept | your text goes there |
| Good French | judge it with [the evaluation](customize.md#prompts-and-the-evaluation), not by reputation |

## Three levels

1. **Other models at Mistral.** Set `MODEL_FAST` and `MODEL_ACCURATE` on your function and redeploy. No code. The defaults, `mistral-small-latest` and `mistral-medium-latest`, are aliases that Mistral moves to newer models: its [model lifecycle page](https://docs.mistral.ai/inference/model-lifecycle) warns that an alias may change behaviour and pricing silently, and that requests to a retired model name fail. For fixed behaviour pin an exact version (Mistral Small 4, which the author uses, is `mistral-small-2603`), run [the evaluation](customize.md#prompts-and-the-evaluation) after every change, and watch the retirement dates.
2. **Another provider with an OpenAI-style API.** Edit the code, then evaluate:
   - `MISTRAL_URL` in [mistral.ts](../../backend/src/mistral.ts), the address of the chat-completions endpoint;
   - the models' default names in [config.ts](../../backend/src/config.ts), or set `MODEL_FAST` and `MODEL_ACCURATE`;
   - the secret's name, `MISTRAL_API_KEY` (config.ts and mistral.ts), if you want it to match your provider;
   - the `response_format` in the payload, if your provider does not support strict JSON schemas (keep `parseModelOutput`: it is the safety net);
   - the status codes: `429` becomes `provider_limit`, any other failure `upstream_error`;
   - the fixed Telegram alert that names Mistral, in [alerts.ts](../../backend/src/alerts.ts) (the alert texts are in English; they are the `MESSAGES` constant);
   - the tests, which intercept calls to `https://api.mistral.ai/` ([handler.test.ts](../../backend/test/handler.test.ts) and `helpers.ts`);
   - then `npm test`, [the evaluation](customize.md#prompts-and-the-evaluation), `npm run package`, deploy.
3. **A provider with a different API.** The call is one short function, `runAction`, in the same file. Keep its contract (it returns the validated answer or one of three error codes) and the output checks in [schema.ts](../../backend/src/schema.ts).

A configurable base URL for OpenAI-compatible providers would make level 2 a configuration change. It is not built, to keep the code small; ask if you want it.

## Mistral and training

> [!IMPORTANT]
> Turn off training on your API data. Do it once, before your first request, and check the page again after Mistral changes its terms.

What Mistral's own pages say (read on 2026-10-10; the help pages are dated 31 August and 3 September 2026, and the privacy policy is effective from 3 September 2026):

- **Training.** For the *Free* mode the page says Mistral may use your data (input and output) to train its models, and that you can opt out at any time. For *Pay-as-you-go* it says customers keep control and can opt out at any time; it states no default.
- **How to opt out of API training.** In the admin console (`admin.mistral.ai`), open **Privacy** in the left-hand menu ("Manage your privacy settings for our API"). In the section **Data usage for improving our services**, switch off **Allow the use of your API calls to train Mistral's AI models**. Mistral's help article calls the same section "Anonymous improvement data". The switch covers what you send from then on: "If you disable this option, your new interactions, or those of your users, will not be used to train our models." **Vibe** (Le Chat) has its own switch in its own settings; the two are separate, and switching off one does not switch off the other. Neither the page nor the help article says whether the API switch covers the whole organisation or one workspace.
- **Retention.** The [privacy policy](https://legal.mistral.ai/terms/privacy-policy/) (section 5) says: "Except for specific APIs, we keep your Input and Output for the period necessary to generate the Output and then for thirty (30) rolling days to monitor abuse (unless zero data retention is activated)." The specific APIs are the Agents API (kept until you close your account) and the Fine-Tuning API (kept until you delete the data or close your account). The function uses neither: it calls chat completions. So each text you send, with its answer, stays at Mistral for 30 days, unless you obtain Zero Data Retention.
- **Zero Data Retention (ZDR).** Available on paid plans, for supported stateless API calls (chat completions among them), not for Labs models; you ask through Mistral's help centre, give a reason, and Mistral may approve or refuse. It is a separate control from the training switch.
- **Feedback buttons** (thumbs up or down with a comment) let Mistral use that exchange. The API has none, but Le Chat does.

Sources: [opt out of training](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training), [do you use my data to train](https://help.mistral.ai/en/articles/347617-do-you-use-my-user-data-to-train-your-artificial-intelligence-models), [Zero Data Retention](https://docs.mistral.ai/admin/monitor-comply/zero-data-retention), [privacy policy](https://legal.mistral.ai/terms/privacy-policy/).

## Any other provider: a checklist

Before you point the function at a provider, find the answers and write down the date.

- [ ] Is API input and output used to train models? On which plans? Where is the switch, and is it on or off for you?
- [ ] How long is it kept, and why? Is there a zero-retention option?
- [ ] In which region is it processed?
- [ ] Can you set a hard monthly cap for this key or workspace? What happens when it is reached (which status code)?
- [ ] Does it support strict JSON schema output? If not, how will the answer be forced into shape?
- [ ] Does the evaluation pass with your prompts?
- [ ] Is the key created inside a workspace or project used only for this?
