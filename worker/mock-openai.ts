/**
 * A stand-in for the OpenAI API, for running the app locally without a key
 * (set MOCK_OPENAI=true in .dev.vars). It answers at the same fetch boundary the tests stub.
 */
export const mockOpenAIFetch: typeof fetch = async (input, init) => {
	const url = String(input);
	await new Promise((r) => setTimeout(r, 600));
	const reply = (body: unknown) => Response.json(body);
	const text = (value: object) => ({
		status: "completed",
		output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }],
	});

	if (url.endsWith("/audio/transcriptions")) {
		return reply({ text: "Our teacher wrote serendipity on the board and asked us to use it." });
	}

	const body = JSON.parse(String(init?.body));
	const { targetWord } = JSON.parse(body.input) as { targetWord: string };
	if (body.text.format.name === "practice_sentence") {
		return reply(
			text({ sentence: `Our teacher wrote ${targetWord} on the board and asked us to use it.`, wordForm: targetWord }),
		);
	}
	return reply(
		text({
			usedWord: true,
			sentenceIntact: true,
			score: 8,
			feedback: "This is mock feedback. Add OPENAI_API_KEY to .dev.vars to have real recordings graded.",
		}),
	);
};
