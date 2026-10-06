import { describe, expect, it, vi } from "vitest";
import { Grade } from "./grading";
import { parseStructuredOutput, toApiError, toStrictJsonSchema } from "./openai";
import { GeneratedSentence } from "./sentence";
import { responsesBody } from "./test-helpers";

const grade = { usedWord: true, sentenceIntact: true, score: 9, feedback: "Clear and correct." };

describe("parseStructuredOutput (grading)", () => {
	it("finds the message after reasoning items and validates it", () => {
		expect(parseStructuredOutput(responsesBody(JSON.stringify(grade)), Grade)).toEqual(grade);
	});

	it.each([
		["a refusal", { output: [{ type: "message", content: [{ type: "refusal", refusal: "No." }] }] }],
		[
			"an output cut off at the token limit",
			responsesBody("{", { status: "incomplete", incomplete_details: { reason: "max_output_tokens" } }),
		],
		["text that isn't JSON", responsesBody("Sure! Here's the grade: 9/10")],
		["a score out of range", responsesBody(JSON.stringify({ ...grade, score: 11 }))],
		["a missing field", responsesBody(JSON.stringify({ usedWord: true, score: 9 }))],
		["no message at all", { output: [{ type: "reasoning" }] }],
		["an unexpected body", null],
	])("rejects %s with a readable 502", (_label, body) => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => parseStructuredOutput(body, Grade)).toThrowError(
			expect.objectContaining({ status: 502, code: "upstream_error" }),
		);
	});
});

describe("toStrictJsonSchema", () => {
	it.each([
		["Grade", Grade],
		["GeneratedSentence", GeneratedSentence],
	])("produces a strict-mode compatible schema for %s", (_name, schema) => {
		const json = toStrictJsonSchema(schema) as {
			type: string;
			properties: Record<string, unknown>;
			required: string[];
			additionalProperties: boolean;
			$schema?: string;
		};
		expect(json.type).toBe("object");
		expect(json.additionalProperties).toBe(false);
		expect([...json.required].sort()).toEqual(Object.keys(json.properties).sort());
		expect(json.$schema).toBeUndefined();
	});
});

describe("toApiError", () => {
	vi.spyOn(console, "error").mockImplementation(() => {});

	it("treats an exhausted budget as the demo limit, not a retryable outage", () => {
		const err = toApiError(429, { error: { code: "project_spend_limit_exceeded", type: "insufficient_quota" } }, null);
		expect(err).toMatchObject({ status: 429, code: "rate_limited" });
	});

	it.each([429, 500, 503])("treats %i as a temporary outage", (status) => {
		expect(toApiError(status, { error: { code: null } }, null)).toMatchObject({
			status: 503,
			code: "upstream_unavailable",
		});
	});

	it("never leaks OpenAI's own error message", () => {
		const err = toApiError(401, { error: { message: "Incorrect API key provided: sk-abc" } }, "req_1");
		expect(err.message).not.toContain("sk-");
		expect(err).toMatchObject({ status: 502, code: "upstream_error" });
	});
});
