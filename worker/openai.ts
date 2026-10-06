import { z } from "zod";
import { ApiError } from "./errors";
import { MODELS } from "./models";

const BASE_URL = "https://api.openai.com/v1";
const TIMEOUT_MS = 25_000;

/** OpenAI returns 429 for both rate limits and exhausted budgets; these codes mean retrying won't help. */
const BILLING_CODES = new Set([
	"insufficient_quota",
	"credit_balance_exhausted",
	"project_spend_limit_exceeded",
	"organization_spend_limit_exceeded",
	"organization_usage_limit_exceeded",
]);

const UNAVAILABLE = "The AI service isn't responding right now. Try again in a moment.";

export interface OpenAIClient {
	apiKey: string;
	/** Injected so tests can stub OpenAI at the network boundary. */
	fetch?: typeof fetch;
}

const UpstreamErrorBody = z.object({
	error: z.object({ code: z.string().nullish(), type: z.string().nullish(), message: z.string().nullish() }),
});

/** Translates an OpenAI failure into an error the learner can act on, and logs the detail for us. */
export function toApiError(status: number, body: unknown, requestId: string | null): ApiError {
	const detail = UpstreamErrorBody.safeParse(body).data?.error;
	console.error("openai_error", { status, code: detail?.code, type: detail?.type, requestId });

	if (status === 429 && (BILLING_CODES.has(detail?.code ?? "") || BILLING_CODES.has(detail?.type ?? ""))) {
		return new ApiError(429, "rate_limited", "The demo has used its AI budget for this month. Try again next month.");
	}
	if (status === 429 || status >= 500) return new ApiError(503, "upstream_unavailable", UNAVAILABLE);
	return new ApiError(502, "upstream_error", "The AI service couldn't handle that request. Try again.");
}

async function call(client: OpenAIClient, path: string, init: RequestInit): Promise<unknown> {
	const doFetch = client.fetch ?? fetch;
	let res: Response;
	try {
		res = await doFetch(`${BASE_URL}${path}`, {
			...init,
			headers: { authorization: `Bearer ${client.apiKey}`, ...init.headers },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
	} catch (err) {
		console.error("openai_unreachable", { path, error: String(err) });
		throw new ApiError(503, "upstream_unavailable", UNAVAILABLE);
	}

	const body: unknown = await res.json().catch(() => null);
	if (!res.ok) throw toApiError(res.status, body, res.headers.get("x-request-id"));
	return body;
}

/**
 * Converts a Zod object schema into the JSON Schema that structured outputs accept
 * in strict mode (closed objects, every property required).
 */
export function toStrictJsonSchema(schema: z.ZodObject) {
	const { $schema: _drop, ...json } = z.toJSONSchema(schema, { target: "draft-2020-12", io: "output" });
	return json;
}

const ResponsesBody = z.object({
	status: z.string().optional(),
	incomplete_details: z.object({ reason: z.string() }).nullish(),
	output: z.array(
		z.object({
			type: z.string(),
			content: z
				.array(z.object({ type: z.string(), text: z.string().optional(), refusal: z.string().optional() }))
				.optional(),
		}),
	),
});

/**
 * Pulls the structured JSON out of a Responses API body and validates it.
 * The message isn't always `output[0]`: reasoning items can come first.
 */
export function parseStructuredOutput<T extends z.ZodType>(body: unknown, schema: T): z.infer<T> {
	const fail = (reason: string) => {
		console.error("openai_bad_output", { reason });
		return new ApiError(502, "upstream_error", "The AI service sent an answer we couldn't read. Try again.");
	};

	const parsed = ResponsesBody.safeParse(body);
	if (!parsed.success) throw fail("unexpected response shape");
	if (parsed.data.status === "incomplete") throw fail(`incomplete: ${parsed.data.incomplete_details?.reason}`);

	const message = parsed.data.output.find((item) => item.type === "message");
	const part = message?.content?.find((c) => c.type === "output_text" || c.type === "refusal");
	if (!part) throw fail("no message in output");
	if (part.type === "refusal") throw fail("model refused");

	let json: unknown;
	try {
		json = JSON.parse(part.text ?? "");
	} catch {
		throw fail("output is not JSON");
	}
	const result = schema.safeParse(json);
	if (!result.success) throw fail("output does not match schema");
	return result.data;
}

interface StructuredRequest<T extends z.ZodObject> {
	model: string;
	effort: string;
	name: string;
	instructions: string;
	input: string;
	schema: T;
	maxOutputTokens?: number;
}

export async function structuredResponse<T extends z.ZodObject>(
	client: OpenAIClient,
	req: StructuredRequest<T>,
): Promise<z.infer<T>> {
	const body = await call(client, "/responses", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			model: req.model,
			instructions: req.instructions,
			input: req.input,
			reasoning: { effort: req.effort },
			max_output_tokens: req.maxOutputTokens ?? 1000,
			store: false,
			text: {
				format: { type: "json_schema", name: req.name, strict: true, schema: toStrictJsonSchema(req.schema) },
			},
		}),
	});
	return parseStructuredOutput(body, req.schema);
}

const TranscriptionBody = z.object({ text: z.string() });

export async function transcribe(client: OpenAIClient, audio: File): Promise<string> {
	const form = new FormData();
	form.append("model", MODELS.transcription.model);
	// The filename's extension tells the API how to decode the audio (webm from Chrome, mp4 from Safari).
	form.append("file", audio, audio.name);
	form.append("languages[]", "en");
	// No prompt or keywords on purpose: hinting the expected sentence would hide real mistakes.

	const body = await call(client, "/audio/transcriptions", { method: "POST", body: form });
	const parsed = TranscriptionBody.safeParse(body);
	if (!parsed.success) throw new ApiError(502, "upstream_error", "The transcription came back empty. Try again.");
	return parsed.data.text.trim();
}
