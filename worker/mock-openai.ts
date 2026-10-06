/**
 * A stand-in for the OpenAI API, for running the app locally without a key
 * (set MOCK_OPENAI=true in .dev.vars). It answers at the same fetch boundary the tests stub,
 * and plays a learner who reads every sentence perfectly.
 */
const TEMPLATES = [
	(w: string) => `Our teacher wrote ${w} on the board and asked us to use it in a sentence.`,
	(w: string) => `I looked up ${w} in the dictionary the night before the exam.`,
	(w: string) => `Could you explain what ${w} means in the second paragraph?`,
];

// Dev-only: remembers the last sentence so the mock transcript can echo it back.
let lastSentence = "";

export const mockOpenAIFetch: typeof fetch = async (input, init) => {
	const url = String(input);
	await new Promise((r) => setTimeout(r, 600));
	const reply = (body: unknown) => Response.json(body);
	const text = (value: object) => ({
		status: "completed",
		output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }],
	});

	if (url.endsWith("/audio/transcriptions")) return reply({ text: lastSentence });

	const body = JSON.parse(String(init?.body));
	const { targetWord } = JSON.parse(body.input) as { targetWord: string };

	if (body.text.format.name === "practice_sentence") {
		lastSentence = TEMPLATES[targetWord.length % TEMPLATES.length](targetWord);
		return reply(text({ sentence: lastSentence, wordForm: targetWord }));
	}
	return reply(
		text({
			usedWord: true,
			sentenceIntact: true,
			score: 9,
			feedback: `You said “${targetWord}” in the gap and read the rest of the sentence as written.`,
		}),
	);
};
