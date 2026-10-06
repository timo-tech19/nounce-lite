import Exercise from "./components/Exercise";
import WordBank from "./components/WordBank";
import { useSessionStats } from "./hooks/useSessionStats";
import { useWordBank } from "./hooks/useWordBank";

const REPO_URL = "https://github.com/timo-tech19/nounce-lite";

export default function App() {
	const bank = useWordBank();
	const { stats, average, record } = useSessionStats();

	return (
		<div className='mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-8'>
			<header className='flex items-center justify-between py-6'>
				<p className='wordmark'>
					<span className='wordmark-gap' aria-hidden />
					nounce
				</p>
				<a href={REPO_URL} className='link text-sm'>
					Source on GitHub
				</a>
			</header>

			<div className='max-w-3xl pt-4 pb-10 sm:pt-8'>
				<h1 className='font-serif text-4xl leading-tight font-semibold text-balance sm:text-5xl'>
					Learn a word by saying it.
				</h1>
				<ol className='steps mt-6'>
					<li>Pick a level and, if you like, a topic.</li>
					<li>Read the sentence aloud, saying the missing word.</li>
					<li>Get a mark and a note on what to fix.</li>
				</ol>
			</div>

			<div className='grid flex-1 gap-10 lg:grid-cols-[15rem_1fr] lg:gap-12'>
				<main className='lg:order-2'>
					<Exercise words={bank.words} onScored={record} />
				</main>

				<aside className='lg:order-1'>
					<WordBank words={bank.words} lastScores={stats.lastScores} onAdd={bank.add} onRemove={bank.remove} />
					{average !== null && (
						<p className='mt-8 text-sm text-ink-soft'>
							{stats.rounds} {stats.rounds === 1 ? "round" : "rounds"} so far, averaging{" "}
							<span className='font-semibold text-ink tabular-nums'>{average.toFixed(1)}/10</span>.
						</p>
					)}
				</aside>
			</div>

			<footer className='mt-16 border-t border-rule py-6 text-sm text-ink-soft'>
				<p>
					Recordings go to OpenAI for transcription and aren't kept by this app. Built by Timo Heman with React,
					Cloudflare Workers and OpenAI.{" "}
					<a href={REPO_URL} className='link'>
						Read the code
					</a>
					.
				</p>
			</footer>
		</div>
	);
}
