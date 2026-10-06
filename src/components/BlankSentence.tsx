import { Fragment } from "react";
import { BLANK } from "../../shared/cloze";

export type BlankState = "hidden" | "revealed" | "correct" | "incorrect";

interface Props {
	blankedSentence: string;
	answer: string;
	state: BlankState;
}

const LABELS: Record<BlankState, string> = {
	hidden: "blank",
	revealed: "",
	correct: "",
	incorrect: "blank, not yet answered correctly",
};

/** Renders a sentence with the practised word hidden, revealed, or marked. */
export default function BlankSentence({ blankedSentence, answer, state }: Props) {
	const parts = blankedSentence.split(BLANK);

	return parts.map((part, i) => (
		<Fragment key={i}>
			{part}
			{i < parts.length - 1 && <Gap answer={answer} state={state} />}
		</Fragment>
	));
}

function Gap({ answer, state }: { answer: string; state: BlankState }) {
	if (state === "revealed" || state === "correct") {
		return (
			<mark data-state={state} className='gap-filled'>
				{answer}
			</mark>
		);
	}
	return (
		<span
			role='img'
			aria-label={LABELS[state]}
			data-state={state}
			className='gap-empty'
			// Size the gap to the hidden word so the sentence doesn't reflow on reveal.
			style={{ width: `${Math.max(answer.length, 4) * 0.62}em` }}
		/>
	);
}
