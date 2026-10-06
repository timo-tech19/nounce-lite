import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BLANK } from "../shared/cloze";
import { CheckResponse, ErrorResponse, MAX_AUDIO_BYTES, SentenceResponse } from "../shared/schemas";
import { MODELS } from "./models";
import { json, responsesBody, testApp } from "./test-helpers";

beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const postSentence = (body: unknown) => ({
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify(body),
});

const postCheck = (audio: Blob = new Blob(["fake audio"], { type: "audio/webm" }), filename = "answer.webm") => {
	const form = new FormData();
	form.append("word", "tranquil");
	form.append("sentence", "The lake was tranquil at dawn.");
	form.append("audio", audio, filename);
	return { method: "POST", body: form };
};

const sentenceReply = (sentence: string, wordForm: string) =>
	json(responsesBody(JSON.stringify({ sentence, wordForm })));
const gradeReply = (grade: object) => json(responsesBody(JSON.stringify(grade)));

const errorOf = async (res: Response) => ErrorResponse.parse(await res.json()).error;

describe("GET /api/health", () => {
	it("returns ok", async () => {
		const res = await testApp([]).request("/api/health");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});
});

describe("POST /api/sentence", () => {
	it("returns the sentence with the word blanked out by the server", async () => {
		const { request, calls } = testApp([sentenceReply("Ephemeral moments matter.", "Ephemeral")]);
		const res = await request("/api/sentence", postSentence({ word: "ephemeral", topic: "travel", level: "B2" }));

		expect(res.status).toBe(200);
		expect(SentenceResponse.parse(await res.json())).toEqual({
			sentence: "Ephemeral moments matter.",
			blankedSentence: `${BLANK} moments matter.`,
			answer: "Ephemeral",
		});

		const sent = JSON.parse(calls[0].init.body as string);
		expect(calls[0].url).toBe("https://api.openai.com/v1/responses");
		expect(sent).toMatchObject({ model: MODELS.sentence.model, store: false, text: { format: { strict: true } } });
		expect(JSON.parse(sent.input)).toMatchObject({ targetWord: "ephemeral", topic: "travel" });
	});

	it("retries once when the model leaves the word out, then gives up with a clear error", async () => {
		const miss = () => sentenceReply("A sentence without it.", "ephemeral");
		const { request, calls } = testApp([miss(), miss()]);
		const res = await request("/api/sentence", postSentence({ word: "ephemeral" }));

		expect(calls).toHaveLength(2);
		expect(res.status).toBe(502);
		expect((await errorOf(res)).message).toMatch(/pick another word/);
	});

	it.each([
		["a missing word", {}],
		["a word over 40 characters", { word: "x".repeat(41) }],
		["a topic over 80 characters", { word: "ephemeral", topic: "x".repeat(81) }],
	])("rejects %s without calling OpenAI", async (_label, body) => {
		const { request, fetch } = testApp([]);
		const res = await request("/api/sentence", postSentence(body));
		expect(res.status).toBe(400);
		expect((await errorOf(res)).code).toBe("bad_request");
		expect(fetch).not.toHaveBeenCalled();
	});

	it("reports an OpenAI outage as temporary", async () => {
		const res = await testApp([json({ error: { message: "overloaded", code: "server_is_overloaded" } }, 503)]).request(
			"/api/sentence",
			postSentence({ word: "ephemeral" }),
		);
		expect(res.status).toBe(503);
		expect((await errorOf(res)).code).toBe("upstream_unavailable");
	});

	it("reports a network failure to OpenAI as temporary", async () => {
		const res = await testApp([new TypeError("fetch failed")]).request(
			"/api/sentence",
			postSentence({ word: "ephemeral" }),
		);
		expect(res.status).toBe(503);
	});
});

describe("POST /api/check", () => {
	const grade = { usedWord: true, sentenceIntact: true, score: 9, feedback: "You said “tranquil” clearly." };

	it("transcribes the audio, grades it and returns the feedback", async () => {
		const { request, calls } = testApp([json({ text: "The lake was tranquil at dawn." }), gradeReply(grade)]);
		const res = await request("/api/check", postCheck(new Blob(["mp4 bytes"], { type: "audio/mp4" }), "answer.mp4"));

		expect(res.status).toBe(200);
		expect(CheckResponse.parse(await res.json())).toEqual({ transcript: "The lake was tranquil at dawn.", ...grade });

		// Safari's mp4 is forwarded as-is, with the extension the API needs to decode it.
		expect(calls[0].url).toBe("https://api.openai.com/v1/audio/transcriptions");
		const upload = calls[0].init.body as FormData;
		expect(upload.get("model")).toBe(MODELS.transcription.model);
		expect((upload.get("file") as File).name).toBe("answer.mp4");

		const gradingInput = JSON.parse(JSON.parse(calls[1].init.body as string).input);
		expect(gradingInput).toMatchObject({ targetWord: "tranquil", transcriptContainsTargetWord: true });
	});

	it("caps the score when the word was wrong, whatever the model scored", async () => {
		const { request } = testApp([
			json({ text: "The lake was tranquillity at dawn." }),
			gradeReply({ ...grade, usedWord: false, score: 8 }),
		]);
		const body = CheckResponse.parse(await (await request("/api/check", postCheck())).json());
		expect(body).toMatchObject({ usedWord: false, score: 3 });
	});

	it("skips grading when the recording has no speech", async () => {
		const { request, calls } = testApp([json({ text: "  " })]);
		const body = CheckResponse.parse(await (await request("/api/check", postCheck())).json());
		expect(calls).toHaveLength(1);
		expect(body).toMatchObject({ score: 0, usedWord: false });
		expect(body.feedback).toMatch(/No speech/);
	});

	it("rejects audio over 2 MB before calling OpenAI", async () => {
		const { request, fetch } = testApp([]);
		const res = await request("/api/check", postCheck(new Blob([new Uint8Array(MAX_AUDIO_BYTES + 1)])));
		expect([400, 413]).toContain(res.status);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("rejects a request without audio", async () => {
		const form = new FormData();
		form.append("word", "tranquil");
		form.append("sentence", "The lake was tranquil.");
		const res = await testApp([]).request("/api/check", { method: "POST", body: form });
		expect(res.status).toBe(400);
	});
});

describe("rate limiting", () => {
	it("returns 429 with a friendly message once a visitor hits the daily cap", async () => {
		const ok = () => sentenceReply("Ephemeral moments matter.", "Ephemeral");
		const { request } = testApp([ok(), ok(), ok()], { DAILY_LIMIT_PER_IP: "2" });

		expect((await request("/api/sentence", postSentence({ word: "ephemeral" }))).status).toBe(200);
		expect((await request("/api/sentence", postSentence({ word: "ephemeral" }))).status).toBe(200);
		const limited = await request("/api/sentence", postSentence({ word: "ephemeral" }));
		expect(limited.status).toBe(429);
		expect((await errorOf(limited)).message).toMatch(/today's limit/);

		// A different visitor is unaffected.
		expect((await request("/api/sentence", postSentence({ word: "ephemeral" }), "198.51.100.1")).status).toBe(200);
	});

	it("doesn't count invalid requests", async () => {
		const { request } = testApp([sentenceReply("Ephemeral moments matter.", "Ephemeral")], { DAILY_LIMIT_PER_IP: "1" });
		await request("/api/sentence", postSentence({ word: "" }));
		expect((await request("/api/sentence", postSentence({ word: "ephemeral" }))).status).toBe(200);
	});
});

describe("unknown routes", () => {
	it("return a JSON 404", async () => {
		const res = await testApp([]).request("/api/nope");
		expect(res.status).toBe(404);
		expect((await errorOf(res)).code).toBe("not_found");
	});
});
