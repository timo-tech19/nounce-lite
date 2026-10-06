import { createApp } from "./app";
import { durableObjectStore } from "./counter";
import { mockOpenAIFetch } from "./mock-openai";

export { DailyCounter } from "./counter";

export default createApp({
	counters: durableObjectStore,
	openai: (env) =>
		env.MOCK_OPENAI === "true" ? { apiKey: "mock", fetch: mockOpenAIFetch } : { apiKey: env.OPENAI_API_KEY },
}) satisfies ExportedHandler<Env>;
