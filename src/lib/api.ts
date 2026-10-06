import type { z } from "zod";
import {
	CheckResponse,
	ErrorResponse,
	SentenceResponse,
	type ErrorCode,
	type SentenceRequest,
} from "../../shared/schemas";

export class RequestError extends Error {
	readonly code: ErrorCode | "network";

	constructor(code: ErrorCode | "network", message: string) {
		super(message);
		this.name = "RequestError";
		this.code = code;
	}
}

const UNEXPECTED = "The server sent an unexpected response. Try again in a moment.";

async function request<T extends z.ZodType>(path: string, init: RequestInit, schema: T): Promise<z.infer<T>> {
	let res: Response;
	try {
		res = await fetch(path, init);
	} catch {
		throw new RequestError("network", "Couldn't reach the server. Check your connection and try again.");
	}

	const body: unknown = await res.json().catch(() => null);

	if (!res.ok) {
		const parsed = ErrorResponse.safeParse(body);
		if (parsed.success) throw new RequestError(parsed.data.error.code, parsed.data.error.message);
		throw new RequestError(res.status === 429 ? "rate_limited" : "internal", UNEXPECTED);
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) throw new RequestError("internal", UNEXPECTED);
	return parsed.data;
}

export const fetchSentence = (input: SentenceRequest, signal?: AbortSignal) =>
	request(
		"/api/sentence",
		{ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal },
		SentenceResponse,
	);

export const checkAnswer = (
	input: { word: string; sentence: string; audio: Blob; filename: string },
	signal?: AbortSignal,
) => {
	const form = new FormData();
	form.append("word", input.word);
	form.append("sentence", input.sentence);
	form.append("audio", input.audio, input.filename);
	return request("/api/check", { method: "POST", body: form, signal }, CheckResponse);
};
