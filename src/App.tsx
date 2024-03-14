import { useState } from "react";
import AudioRecorder from "./components/AudioRecorder";
import { useAudioRecorder } from "react-audio-voice-recorder";
import { convertToFileExtension } from "./utils/convertToFileExtension";
import BlankSetence from "./components/BlankSetence";

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

function App() {
	const [sentence, setSentence] = useState("");
	const [words, setWords] = useState<string[]>([
		"serendipity",
		"ephemeral",
		"tranquility",
		"elixir",
		"solitude",
	]);
	const [currentWord, setCurrentWord] = useState("");
	const [newWord, setNewWord] = useState("");
	const [topic, setTopic] = useState("");
	const [loading, setLoading] = useState(false);
	const [transcribing, setTranscibing] = useState(false);
	const [show, setShow] = useState(false);
	const [transcription, setTranscription] = useState("");
	const recorderControls = useAudioRecorder();

	const addNewWord = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.preventDefault();
		setWords((words) => [...words, newWord.toLowerCase()]);
		setNewWord("");
	};

	const generateSentence = async () => {
		setShow(false);
		setSentence("");
		setTranscription("");
		const randomWord = words[Math.floor(Math.random() * words.length)];
		setCurrentWord(randomWord);

		try {
			setLoading(true);
			const res = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${OPENAI_API_KEY}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					model: "gpt-3.5-turbo",
					messages: [
						{
							role: "user",
							content: `I would like you to generate a short sentence with the word "${randomWord}". Make sure the sentence is related to the topic "${topic}"`,
						},
					],
				}),
			});

			const data = await res.json();
			setSentence(data?.choices[0].message?.content);
		} catch (err) {
			console.log(err);
		}
		setLoading(false);
	};

	const generateAnswer = async () => {
		try {
			setTranscibing(true);
			const formData = new FormData();
			const blob = await convertToFileExtension(
				recorderControls.recordingBlob!,
				"mp3"
			);
			formData.append("model", "whisper-1");
			formData.append("file", blob);

			const res = await fetch(
				"https://api.openai.com/v1/audio/transcriptions",
				{
					method: "POST",
					body: formData,
					headers: {
						Authorization: `Bearer ${OPENAI_API_KEY}`,
					},
				}
			);

			const data = await res.json();
			setTranscription((data?.text as string).toLowerCase());
		} catch (err) {
			console.log(err);
		}
		setTranscibing(false);
	};

	return (
		<div className='px-8 max-w-7xl mx-auto pb-8'>
			<nav className='py-8'>
				<h1 className='text-4xl font-bold'>
					<span className='text-teal-500'>nounce</span>-lite
				</h1>
			</nav>
			<main>
				<h2 className='text-4xl font-semibold'>Playground</h2>
				<p className='text-xl mt-4'>Start your journey to articulate speech</p>

				<div className='mt-8 bg-slate-100 p-4 rounded-md shadow-sm'>
					<h2 className='text-2xl font-semibold'>Word Bank</h2>
					<div>
						<form>
							<div className='flex flex-col justify-center items-center'>
								<label htmlFor='word'>Add words to your word bank</label>
								<div className='flex mt-2'>
									<input
										onChange={(e) => setNewWord(e.target.value)}
										value={newWord}
										className='rounded-l-md outline-none px-2'
										type='text'
										name='word'
									/>
									<button
										onClick={addNewWord}
										className='bg-black text-white px-4 py-2 rounded-r-md hover:bg-gray-800 transition'
									>
										Add
									</button>
								</div>
							</div>
						</form>
						<ul className='flex flex-row flex-wrap gap-2 items-center justify-center mt-4'>
							{words.map((word, index) => {
								return (
									<li key={index} className='bg-white p-2 rounded-md'>
										{word}
									</li>
								);
							})}
						</ul>
					</div>
				</div>

				<div className='bg-slate-100 p-4 mt-12 rounded-md shadow-sm'>
					<p className='text-center text-lg font-semibold'>
						Practise with random words from your word bank
					</p>
					<p className='text-center'>
						Click the button below to generate a random sentence to start.
					</p>
					<form>
						<div className='flex justify-center mt-4'>
							<input
								onChange={(e) => setTopic(e.target.value)}
								value={topic}
								type='text'
								name='topic'
								className='rounded-l-md outline-none px-2'
								placeholder='Add an optional topic'
							/>
							<button
								onClick={(e) => {
									e.preventDefault();
									generateSentence();
								}}
								className='bg-teal-500 hover:bg-teal-400 transition px-4 py-2 text-white font-semibold rounded-r-md'
							>
								{loading ? "Generating..." : "Generate"}
							</button>
						</div>
					</form>
				</div>
				{sentence && (
					<>
						<div className='flex flex-row items-center mt-4 min-w-40 w-fit bg-slate-50 mx-auto shadow-md p-4 rounded-md'>
							<div>
								<BlankSetence
									sentence={sentence}
									word={currentWord}
									transcription={transcription}
									show={show}
								/>
							</div>
							<button
								disabled={show || transcription.includes(currentWord)}
								onClick={() => setShow(true)}
								className='ml-4 bg-black text-white py-1 px-2 rounded-md hover:bg-gray-800 transition disabled:bg-gray-300'
							>
								Show
							</button>
						</div>
						<div className='flex flex-col items-center justify-center'>
							{!transcription.includes(currentWord) && (
								<>
									<AudioRecorder {...recorderControls} />
									{recorderControls.recordingBlob && (
										<button
											onClick={generateAnswer}
											className='bg-black text-white px-4 py-2 mt-2 rounded-md hover:bg-gray-800 transition'
										>
											{transcribing ? "Verifying..." : "Submit"}
										</button>
									)}
								</>
							)}
						</div>
						{transcription && (
							<p className='text-center font-semibold text-lg mt-8'>
								{transcription.includes(currentWord)
									? "Correct!"
									: "Incorrect. Try Again"}
							</p>
						)}
					</>
				)}
			</main>
		</div>
	);
}

export default App;
