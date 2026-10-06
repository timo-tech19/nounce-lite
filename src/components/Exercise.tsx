import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LEVELS, MAX_TOPIC_LENGTH, Level, type CheckResponse, type SentenceResponse } from "../../shared/schemas";
import { useRecorder } from "../hooks/useRecorder";
import { useSpeech } from "../hooks/useSpeech";
import { checkAnswer, fetchSentence, RequestError } from "../lib/api";
import { pickWord } from "../lib/pickWord";
import { readJSON, writeJSON } from "../lib/storage";
import BlankSentence, { type BlankState } from "./BlankSentence";
import ErrorNotice from "./ErrorNotice";
import Feedback from "./Feedback";
import Recorder from "./Recorder";

const LEVEL_KEY = "nounce:level";

const LEVEL_NAMES: Record<Level, string> = {
	A2: "Elementary",
	B1: "Intermediate",
	B2: "Upper intermediate",
	C1: "Advanced",
};

type Round = SentenceResponse & { word: string };

interface Props {
	words: string[];
	onScored: (word: string, score: number) => void;
}

const asRequestError = (err: unknown) =>
	err instanceof RequestError ? err : new RequestError("internal", "Something unexpected went wrong. Try again.");

export default function Exercise({ words, onScored }: Props) {
	const [level, setLevel] = useState<Level>(() =>
		readJSON(LEVEL_KEY, "B1", (v): v is Level => Level.safeParse(v).success),
	);
	const [topic, setTopic] = useState("");
	const [round, setRound] = useState<Round | null>(null);
	const [generating, setGenerating] = useState(false);
	const [generateError, setGenerateError] = useState<RequestError | null>(null);
	const [revealed, setRevealed] = useState(false);
	const [checking, setChecking] = useState(false);
	const [checkError, setCheckError] = useState<RequestError | null>(null);
	const [result, setResult] = useState<CheckResponse | null>(null);

	const recorder = useRecorder();
	const speech = useSpeech();
	const pending = useRef<AbortController | null>(null);
	const topicId = useId();

	useEffect(() => writeJSON(LEVEL_KEY, level), [level]);
	useEffect(() => () => pending.current?.abort(), []);

	const { discard, stop } = recorder;
	const { stop: stopSpeech } = speech;

	const resetAttempt = useCallback(() => {
		stop();
		discard();
		stopSpeech();
		setResult(null);
		setCheckError(null);
	}, [discard, stop, stopSpeech]);

	const generate = useCallback(
		async (word = pickWord(words, round?.word)) => {
			if (!word) return;
			pending.current?.abort();
			const controller = (pending.current = new AbortController());
			resetAttempt();
			setGenerateError(null);
			setGenerating(true);
			setRevealed(false);
			try {
				const sentence = await fetchSentence({ word, topic, level }, controller.signal);
				setRound({ ...sentence, word });
			} catch (err) {
				if (!controller.signal.aborted) setGenerateError(asRequestError(err));
			} finally {
				if (pending.current === controller) setGenerating(false);
			}
		},
		[level, resetAttempt, round?.word, topic, words],
	);

	const check = useCallback(async () => {
		if (!round || !recorder.recording) return;
		const controller = (pending.current = new AbortController());
		setCheckError(null);
		setChecking(true);
		try {
			const graded = await checkAnswer(
				{
					word: round.word,
					sentence: round.sentence,
					audio: recorder.recording.blob,
					filename: recorder.recording.filename,
				},
				controller.signal,
			);
			setResult(graded);
			onScored(round.word, graded.score);
		} catch (err) {
			if (!controller.signal.aborted) setCheckError(asRequestError(err));
		} finally {
			if (pending.current === controller) setChecking(false);
		}
	}, [onScored, recorder.recording, round]);

	const submit = (e: FormEvent) => {
		e.preventDefault();
		void generate();
	};

	const blankState: BlankState = result
		? result.usedWord
			? "correct"
			: "incorrect"
		: revealed
			? "revealed"
			: "hidden";
	const canGenerate = words.length > 0 && !generating;

	return (
		<section aria-label='Practice' className='sheet'>
			<form onSubmit={submit} className='flex flex-wrap items-end gap-x-6 gap-y-4'>
				<fieldset>
					<legend className='text-sm text-ink-soft'>Level</legend>
					<div className='segmented mt-1'>
						{LEVELS.map((l) => (
							<label key={l} title={LEVEL_NAMES[l]}>
								<input
									type='radio'
									name='level'
									value={l}
									checked={level === l}
									onChange={() => setLevel(l)}
									className='sr-only'
								/>
								<span>{l}</span>
								<span className='sr-only'> ({LEVEL_NAMES[l]})</span>
							</label>
						))}
					</div>
				</fieldset>

				<div className='min-w-48 flex-1'>
					<label htmlFor={topicId} className='text-sm text-ink-soft'>
						Topic <span className='text-ink-soft/70'>(optional)</span>
					</label>
					<input
						id={topicId}
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						maxLength={MAX_TOPIC_LENGTH}
						placeholder='e.g. cooking, job interviews'
						className='field mt-1 w-full'
					/>
				</div>

				<button type='submit' disabled={!canGenerate} className='btn-primary'>
					{generating ? "Writing…" : round ? "New sentence" : "Write a sentence"}
				</button>
			</form>

			<div className='mt-10' aria-live='polite' aria-busy={generating}>
				{round ? (
					<p className='sentence' data-stale={generating || undefined}>
						<BlankSentence blankedSentence={round.blankedSentence} answer={round.answer} state={blankState} />
					</p>
				) : (
					<p className='sentence text-ink-soft/70'>
						{generating ? (
							"Writing a sentence…"
						) : words.length ? (
							<>
								Your sentence appears here, with one word <span className='gap-empty w-24' aria-hidden /> for you to
								say.
							</>
						) : (
							"Add a word to your word bank to start."
						)}
					</p>
				)}
			</div>

			{generateError && <ErrorNotice error={generateError} onRetry={() => void generate(round?.word)} />}

			{round && !generating && (
				<>
					<div className='mt-4 flex flex-wrap gap-x-5 gap-y-2'>
						{!revealed && !result && (
							<button type='button' className='link' onClick={() => setRevealed(true)}>
								Show the word
							</button>
						)}
						{speech.supported && (revealed || result) && (
							<button
								type='button'
								className='link'
								onClick={() => (speech.speaking ? speech.stop() : speech.speak(round.sentence))}
							>
								{speech.speaking ? "Stop" : "Hear the sentence"}
							</button>
						)}
					</div>

					{result ? (
						<Feedback
							result={result}
							answer={round.answer}
							onRetry={() => {
								resetAttempt();
								setRevealed(false);
							}}
							onNext={() => void generate()}
						/>
					) : (
						<Recorder recorder={recorder} checking={checking} onCheck={() => void check()} />
					)}

					{checkError && <ErrorNotice error={checkError} onRetry={() => void check()} />}
				</>
			)}
		</section>
	);
}
