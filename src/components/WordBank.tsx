import { useId, useState, type FormEvent } from "react";
import { MAX_WORD_LENGTH } from "../../shared/schemas";
import type { AddResult } from "../hooks/useWordBank";
import type { SessionStats } from "../hooks/useSessionStats";

interface Props {
	words: string[];
	lastScores: SessionStats["lastScores"];
	onAdd: (word: string) => AddResult;
	onRemove: (word: string) => void;
}

export default function WordBank({ words, lastScores, onAdd, onRemove }: Props) {
	const [draft, setDraft] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const inputId = useId();
	const messageId = useId();

	const submit = (e: FormEvent) => {
		e.preventDefault();
		const result = onAdd(draft);
		if (result.ok) {
			setDraft("");
			setMessage(null);
		} else {
			setMessage(result.reason);
		}
	};

	return (
		<section aria-labelledby='word-bank-heading'>
			<div className='flex items-baseline justify-between'>
				<h2 id='word-bank-heading' className='font-serif text-xl font-semibold'>
					Word bank
				</h2>
				<p className='text-sm text-ink-soft'>
					{words.length} {words.length === 1 ? "word" : "words"}
				</p>
			</div>

			<form onSubmit={submit} className='mt-3'>
				<label htmlFor={inputId} className='text-sm text-ink-soft'>
					Add a word you want to practise
				</label>
				<div className='mt-1 flex'>
					<input
						id={inputId}
						value={draft}
						onChange={(e) => {
							setDraft(e.target.value);
							setMessage(null);
						}}
						maxLength={MAX_WORD_LENGTH}
						autoComplete='off'
						autoCapitalize='none'
						spellCheck
						aria-invalid={message ? true : undefined}
						aria-describedby={message ? messageId : undefined}
						className='field min-w-0 flex-1 rounded-r-none'
						placeholder='e.g. ubiquitous'
					/>
					<button type='submit' className='btn-secondary rounded-l-none border-l-0'>
						Add
					</button>
				</div>
				{message && (
					<p id={messageId} role='alert' className='mt-1.5 text-sm text-red-pen'>
						{message}
					</p>
				)}
			</form>

			{words.length === 0 ? (
				<p className='mt-4 text-sm text-ink-soft'>Your word bank is empty. Add a word above to start practising.</p>
			) : (
				<ul className='mt-4 flex flex-wrap gap-1.5 lg:flex-col lg:gap-0'>
					{words.map((word) => (
						<li
							key={word}
							className='flex items-center gap-2 rounded-md border border-rule bg-paper px-2.5 py-1 lg:rounded-none lg:border-0 lg:border-b lg:bg-transparent lg:px-0 lg:py-1.5'
						>
							<span>{word}</span>
							{lastScores[word] !== undefined && (
								<span className='text-xs tabular-nums text-ink-soft' title='Your last score for this word'>
									{lastScores[word]}/10
								</span>
							)}
							<button
								type='button'
								onClick={() => onRemove(word)}
								aria-label={`Remove ${word}`}
								className='ml-auto -my-1 rounded p-1 text-ink-soft/60 hover:text-red-pen focus-visible:text-red-pen'
							>
								<svg viewBox='0 0 16 16' className='size-3.5' aria-hidden>
									<path d='M4 4l8 8M12 4l-8 8' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
								</svg>
							</button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
