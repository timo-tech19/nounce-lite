import { vi } from "vitest";
import { createApp } from "./app";
import type { CounterStore } from "./rate-limit";

/** A Responses API body as the docs describe it: reasoning items can come before the message. */
export const responsesBody = (text: string, extra: object = {}) => ({
	status: "completed",
	output: [
		{ type: "reasoning", summary: [] },
		{ type: "message", role: "assistant", content: [{ type: "output_text", text, annotations: [] }] },
	],
	...extra,
});

export const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const memoryStore = (): CounterStore => {
	const counts = new Map<string, number>();
	return {
		hit: async (scope, day, bucket) => {
			const key = `${scope}|${day}|${bucket}`;
			counts.set(key, (counts.get(key) ?? 0) + 1);
			return counts.get(key)!;
		},
	};
};

/**
 * The real app with OpenAI stubbed at the network boundary. `replies` are returned in order;
 * `calls` records what the Worker sent to OpenAI.
 */
export function testApp(replies: (Response | Error)[], env: Partial<Env> = {}) {
	const queue = [...replies];
	const calls: { url: string; init: RequestInit }[] = [];
	const fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
		calls.push({ url: String(url), init: init ?? {} });
		const next = queue.shift();
		if (!next) throw new Error(`Unexpected OpenAI call to ${url}`);
		if (next instanceof Error) throw next;
		return next;
	});
	const store = memoryStore();
	const app = createApp({ counters: () => store, openai: () => ({ apiKey: "test-key", fetch }) });
	const fullEnv = { DAILY_LIMIT_PER_IP: "25", DAILY_LIMIT_GLOBAL: "600", OPENAI_API_KEY: "test-key", ...env } as Env;

	const request = (path: string, init: RequestInit = {}, ip = "203.0.113.7") =>
		app.request(path, { ...init, headers: { "cf-connecting-ip": ip, ...init.headers } }, fullEnv);

	return { request, calls, fetch };
}
