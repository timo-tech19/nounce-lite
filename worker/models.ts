/**
 * Every OpenAI model the app uses, in one place. Checked against
 * developers.openai.com/api/docs/models in October 2026.
 */
export const MODELS = {
	/** Writes practice sentences. The cost-efficient tier; no reasoning needed for one sentence. */
	sentence: { model: "gpt-6-luna", effort: "none" },
	/** Grades the learner's answer. A little reasoning makes the verdicts more consistent. */
	grading: { model: "gpt-6-luna", effort: "low" },
	/** Speech to text. Accepts webm (Chrome, Firefox) and mp4 (Safari) uploads directly. */
	transcription: { model: "gpt-transcribe" },
} as const;
