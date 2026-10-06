# nounce

Vocabulary practice by speaking: the Worker writes a sentence with a word blanked out, the learner reads it aloud, and the Worker transcribes and grades it.

## Layout

- `src/` React SPA (Vite, Tailwind v4). No secrets here, ever: everything that needs the OpenAI key goes through `/api/*`.
- `worker/` Cloudflare Worker (Hono). Serves `/api/*`; static assets are served by Workers Assets.
- `shared/` Zod schemas and text helpers imported by both sides. Change a request or response shape here first.

## Commands

Prefix with `export PATH="$HOME/.local/share/mise/shims:$PATH" MISE_NODE_VERSION=22.22.3` in this environment.

- `pnpm dev` runs the SPA and the Worker together (needs `OPENAI_API_KEY` in `.dev.vars`).
- `pnpm check` runs typecheck, lint and tests. Run it before every commit.
- `pnpm build` then `pnpm exec wrangler deploy` to ship.

## Conventions

- Model IDs live only in `worker/models.ts`.
- Every model reply is requested with a strict JSON schema and parsed with Zod (`parseStructuredOutput`); never string-split model output.
- API errors are `ApiError` instances rendered as `{ error: { code, message } }`; messages are shown to learners as-is, so write them in plain language and never include upstream error text.
- Tests mock OpenAI at the `fetch` boundary (`OpenAIClient.fetch`), not by mocking modules.
- Tabs, double quotes, single quotes in JSX (Prettier enforces this).
