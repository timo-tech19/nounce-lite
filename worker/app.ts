import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { z } from "zod";
import { CheckFields, MAX_AUDIO_BYTES, SentenceRequest } from "../shared/schemas";
import { ApiError, badRequest } from "./errors";
import { checkAnswer } from "./grading";
import type { OpenAIClient } from "./openai";
import { rateLimit, type CounterStore } from "./rate-limit";
import { generateSentence } from "./sentence";

export interface Deps {
	counters: (env: Env) => CounterStore;
	openai: (env: Env) => OpenAIClient;
}

/** Turns a failed validation into a 400 that names the first problem in plain language. */
const validate = <T extends z.ZodType>(target: "json" | "form", schema: T) =>
	zValidator(target, schema, (result) => {
		if (!result.success) throw badRequest(result.error.issues[0]?.message ?? "Invalid request.");
	});

export function createApp(deps: Deps) {
	const app = new Hono<{ Bindings: Env }>().basePath("/api");

	app.get("/health", (c) => c.json({ ok: true }));

	app.post("/sentence", validate("json", SentenceRequest), rateLimit("sentence", deps.counters), async (c) => {
		const input = c.req.valid("json");
		return c.json(await generateSentence(deps.openai(c.env), input));
	});

	app.post(
		"/check",
		bodyLimit({
			// Room for the text fields and multipart boundaries on top of the audio itself.
			maxSize: MAX_AUDIO_BYTES + 16 * 1024,
			onError: () => {
				throw new ApiError(413, "payload_too_large", "The recording is too long. Keep it under 15 seconds.");
			},
		}),
		validate("form", CheckFields),
		rateLimit("check", deps.counters),
		async (c) => {
			const input = c.req.valid("form");
			return c.json(await checkAnswer(deps.openai(c.env), input));
		},
	);

	app.notFound((c) => c.json(new ApiError(404, "not_found", "No such endpoint.").toJSON(), 404));

	app.onError((err, c) => {
		if (err instanceof ApiError) return c.json(err.toJSON(), err.status);
		console.error("unhandled_error", err);
		return c.json(new ApiError(500, "internal", "Something went wrong on our side. Try again.").toJSON(), 500);
	});

	return app;
}
