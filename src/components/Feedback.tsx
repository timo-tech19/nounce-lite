import { useEffect, useRef } from "react";
import { BLANK, blankSentence } from "../../shared/cloze";
import type { CheckResponse } from "../../shared/schemas";

interface Props {
	result: CheckResponse;
	answer: string;
	onRetry: () => void;
	onNext: () => void;
}

const headline = ({ usedWord, score }: CheckResponse) => {
	if (usedWord && score >= 9) return "Spot on.";
	if (usedWord) return "You got the word.";
	return "Not quite.";
};

export default function Feedback({ result, answer, onRetry, onNext }: Props) {
	const headingRef = useRef<HTMLHeadingElement>(null);

	// Move focus to the result so keyboard and screen reader users land on it.
	useEffect(() => headingRef.current?.focus(), [result]);

	return (
		<section aria-labelledby='feedback-heading' className='mt-8 flex gap-5 sm:gap-7'>
			<ScoreMark score={result.score} good={result.usedWord} />
			<div className='min-w-0 flex-1'>
				<h3 id='feedback-heading' ref={headingRef} tabIndex={-1} className='font-serif text-2xl font-semibold'>
					{headline(result)}
				</h3>
				<p className='mt-1 max-w-prose text-lg'>{result.feedback}</p>

				<figure className='mt-4'>
					<figcaption className='text-sm text-ink-soft'>What we heard</figcaption>
					<blockquote className='mt-1 max-w-prose font-serif text-lg italic'>
						{result.transcript ? <Transcript text={result.transcript} answer={answer} /> : "(silence)"}
					</blockquote>
				</figure>

				<div className='mt-6 flex flex-wrap gap-3'>
					<button type='button' onClick={onNext} className='btn-primary'>
						Next sentence
					</button>
					<button type='button' onClick={onRetry} className='btn-secondary'>
						Try this one again
					</button>
				</div>
			</div>
		</section>
	);
}

/** Highlights the target word in what the learner said, if it's there. */
function Transcript({ text, answer }: { text: string; answer: string }) {
	const hit = blankSentence(text, answer);
	if (!hit) return <>“{text}”</>;
	const [before, after] = hit.blanked.split(BLANK);
	return (
		<>
			“{before}
			<mark className='gap-filled'>{hit.answer}</mark>
			{after}”
		</>
	);
}

/** The score as a teacher would mark it: in red pen, circled. */
function ScoreMark({ score, good }: { score: number; good: boolean }) {
	return (
		<div className='score-mark' data-good={good || undefined}>
			<svg viewBox='0 0 120 100' aria-hidden className='absolute inset-0 size-full overflow-visible'>
				<path
					className='score-circle'
					pathLength={1}
					d='M84 14C66 4 30 6 16 26 2 46 10 78 40 90c26 10 62 2 72-24 9-23-4-46-26-54-12-4-27-4-38 1'
				/>
			</svg>
			<span className='relative'>
				<span className='sr-only'>Score: </span>
				{score}
				<span className='text-[0.55em]'>/10</span>
			</span>
		</div>
	);
}
