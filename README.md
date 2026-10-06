# nounce

Learn a word by saying it. nounce writes a sentence around a word from your list, hides the word, and listens while you read the sentence aloud. AI transcribes your answer and marks it, with a note on what to fix.

**Stack:** React 19, TypeScript, Tailwind CSS v4, Cloudflare Workers, Hono, Zod, OpenAI (Responses API + speech-to-text), Vitest

![The sentence with the word revealed in highlighter, a 9/10 score circled in red pen, and feedback on what the learner said](docs/screenshots/feedback.png)

<table>
  <tr>
    <td width="68%"><img src="docs/screenshots/recording.png" alt="Recording an answer: the sentence has a gap and a live waveform shows the microphone input"></td>
    <td><img src="docs/screenshots/mobile-dark.png" alt="The same round on a phone in dark mode"></td>
  </tr>
</table>

<sub>Screenshots are from mock mode (<code>MOCK_OPENAI=true</code>), which stands in for OpenAI with canned replies; see <a href="#run-it-locally">Run it locally</a>.</sub>

## How it works

```
Browser (React SPA)                    Cloudflare Worker (Hono)              OpenAI
───────────────────                    ────────────────────────              ──────
word bank (localStorage)
POST /api/sentence {word, topic} ───►  validate (Zod) · rate-limit  ───►   chat model → JSON
record audio (webm / mp4)
POST /api/check  (audio + target) ───► validate size/length · rate-limit ─► transcription
                                       then chat model grades it      ───►  chat model → JSON
◄─── {transcript, usedWord, feedback, score}
```

One Worker serves both the built SPA (static assets) and `/api/*`, so it deploys as a single unit and the OpenAI key lives only in a Worker secret.

1. You pick a level (A2 to C1) and an optional topic. The Worker asks the model for one sentence and the exact form of your word it used, then blanks that word out itself. If the model's sentence doesn't contain the word, it retries once.
2. You record your answer. Chrome and Firefox record webm, Safari records mp4; both go straight to the transcription API, with no in-browser conversion.
3. The Worker transcribes the audio, then asks the model to grade it against a strict JSON schema: did you say the right word, in the right form, and keep the rest of the sentence? You get a 0–10 mark, the transcript with your word highlighted, and one or two sentences of specific feedback.

## Engineering notes

- **No secrets in the browser.** The 2024 version called OpenAI from the client with a `VITE_` key baked into the bundle. Now every model call goes through the Worker, and CI fails the build if anything resembling a key appears in `dist/client`.
- **Structured outputs, parsed with Zod.** Both model calls use the Responses API's strict JSON-schema mode. The schemas are generated from the same Zod definitions that then validate the reply, and a parse failure becomes a readable error instead of a broken UI.
- **One source of truth for the contract.** `shared/schemas.ts` defines every request, response and error shape. The Worker validates requests with it; the client validates responses with it.
- **Grading that understands words.** The old check was `transcript.includes(word)`, which passed "serendipitous" for "serendipity" and failed "Serendipity!". The model now judges form and context, with a deterministic whole-word match passed in as a hint and a score cap when the word was wrong.
- **Errors people can act on.** Every failure (bad input, rate limit, OpenAI outage or exhausted budget, mic permission denied, offline) has its own message and, where it helps, a retry button. OpenAI's own error text is logged, never shown.
- **Rate limiting that holds up.** A per-visitor and a global daily cap, counted exactly in a SQLite-backed Durable Object. Visitors are identified by a salted hash of their IP, so raw IPs aren't stored.
- **Runs without a key.** Set `MOCK_OPENAI=true` and the Worker answers from canned replies at the same `fetch` boundary the tests stub, so you can click through the whole app without an OpenAI account.

## Run it locally

Requires Node 22.12+ and pnpm.

```sh
pnpm install
cp .dev.vars.example .dev.vars   # add OPENAI_API_KEY, or set MOCK_OPENAI=true
pnpm dev                         # SPA and Worker together on http://localhost:5173
```

| Command           | What it does                                                        |
| ----------------- | ------------------------------------------------------------------- |
| `pnpm check`      | Typecheck, lint (ESLint + Prettier) and test                        |
| `pnpm test`       | Vitest: Worker routes with OpenAI stubbed at `fetch`, plus UI tests |
| `pnpm build`      | Build the SPA and the Worker into `dist/`                           |
| `pnpm deploy`     | Build and deploy to Cloudflare                                      |
| `pnpm cf-typegen` | Regenerate Worker binding types after editing `wrangler.jsonc`      |

CI (GitHub Actions) runs typecheck, lint, tests and a build on every push, then checks that no API key made it into the client bundle.

To deploy your own copy: `pnpm exec wrangler secret put OPENAI_API_KEY`, then `pnpm deploy`. Set a monthly hard spend limit on the OpenAI project too; the daily caps in `wrangler.jsonc` keep usage low, and the spend limit is the backstop.

## Project layout

```
src/      React app: exercise, recorder, word bank, feedback
worker/   Hono API: routes, OpenAI client, prompts, grading, rate limiting
shared/   Zod schemas and text helpers used by both
```

---

Started as a take-home in 2024; rebuilt in 2026 with a server-side API, structured AI grading and tests.
