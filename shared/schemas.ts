import { z } from "zod";

/** CEFR levels the sentence generator can target. */
export const LEVELS = ["A2", "B1", "B2", "C1"] as const;
export const Level = z.enum(LEVELS);
export type Level = z.infer<typeof Level>;

export const MAX_WORD_LENGTH = 40;
export const MAX_TOPIC_LENGTH = 80;
export const MAX_SENTENCE_LENGTH = 300;
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
export const MAX_RECORDING_SECONDS = 15;

/** A single word or short phrase: letters, spaces, hyphens and apostrophes. */
export const Word = z
	.string()
	.trim()
	.min(1, "Enter a word.")
	.max(MAX_WORD_LENGTH, `Keep words under ${MAX_WORD_LENGTH} characters.`)
	.regex(/^[\p{L}][\p{L}'’ -]*$/u, "Use letters only (hyphens and apostrophes are fine).");

export const SentenceRequest = z.object({
	word: Word,
	topic: z
		.string()
		.trim()
		.max(MAX_TOPIC_LENGTH, `Keep the topic under ${MAX_TOPIC_LENGTH} characters.`)
		.optional()
		.transform((t) => t || undefined),
	level: Level.default("B1"),
});
export type SentenceRequest = z.input<typeof SentenceRequest>;

export const SentenceResponse = z.object({
	sentence: z.string(),
	/** The sentence with the practised word replaced by `BLANK`. */
	blankedSentence: z.string(),
	/** The exact form of the word used in the sentence, e.g. "tranquil" → "tranquil". */
	answer: z.string(),
});
export type SentenceResponse = z.infer<typeof SentenceResponse>;

export const CheckFields = z.object({
	word: Word,
	sentence: z.string().trim().min(1).max(MAX_SENTENCE_LENGTH),
	audio: z
		.instanceof(File, { message: "Attach the recording as a file." })
		.refine((f) => f.size > 0, "The recording is empty.")
		.refine((f) => f.size <= MAX_AUDIO_BYTES, "The recording is too long. Keep it under 15 seconds."),
});

export const CheckResponse = z.object({
	transcript: z.string(),
	usedWord: z.boolean(),
	sentenceIntact: z.boolean(),
	feedback: z.string(),
	/** 0–10. */
	score: z.number().int().min(0).max(10),
});
export type CheckResponse = z.infer<typeof CheckResponse>;

export const ERROR_CODES = [
	"bad_request",
	"payload_too_large",
	"rate_limited",
	"upstream_unavailable",
	"upstream_error",
	"not_found",
	"internal",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ErrorResponse = z.object({
	error: z.object({
		code: z.enum(ERROR_CODES),
		message: z.string(),
	}),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
