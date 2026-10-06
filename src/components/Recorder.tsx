import { useRef, useState } from "react";
import type { RecorderError, useRecorder } from "../hooks/useRecorder";
import Waveform from "./Waveform";

type RecorderControls = ReturnType<typeof useRecorder>;

interface Props {
	recorder: RecorderControls;
	checking: boolean;
	onCheck: () => void;
}

const MIC_ERRORS: Record<RecorderError, string> = {
	denied: "Microphone access is blocked. Allow it in your browser's site settings, then try again.",
	"no-device": "No microphone found. Connect one and try again.",
	unsupported: "This browser can't record audio. Try a recent version of Chrome, Safari, Edge or Firefox.",
	failed: "Recording stopped unexpectedly. Try again.",
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function Recorder({ recorder, checking, onCheck }: Props) {
	const { status, error, stream, elapsed, maxSeconds, recording, start, stop, discard } = recorder;
	const isRecording = status === "recording";

	return (
		<div className='mt-8'>
			<div className='flex items-center gap-4'>
				<button
					type='button'
					onClick={isRecording ? stop : start}
					disabled={status === "requesting" || checking}
					aria-pressed={isRecording}
					className='record-button'
					data-recording={isRecording || undefined}
				>
					<span className='sr-only'>{isRecording ? "Stop recording" : "Record your answer"}</span>
					{isRecording ? (
						<svg viewBox='0 0 24 24' className='size-6' aria-hidden>
							<rect x='6' y='6' width='12' height='12' rx='2' fill='currentColor' />
						</svg>
					) : (
						<svg viewBox='0 0 24 24' className='size-7' aria-hidden>
							<path
								fill='currentColor'
								d='M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Zm6-3.5a.75.75 0 0 0-1.5 0 4.5 4.5 0 0 1-9 0 .75.75 0 0 0-1.5 0 6 6 0 0 0 5.25 5.95V20h-2.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-2.5v-2.55A6 6 0 0 0 18 11.5Z'
							/>
						</svg>
					)}
				</button>

				<div className='min-w-0 flex-1'>
					{isRecording && stream ? (
						<>
							<Waveform stream={stream} />
							<p className='mt-1 text-sm tabular-nums text-ink-soft' aria-live='off'>
								{clock(elapsed)} / {clock(maxSeconds)}
								<span className='sr-only'>. Recording. Press stop when you've finished the sentence.</span>
							</p>
						</>
					) : recording ? (
						<Playback
							key={recording.url}
							url={recording.url}
							seconds={recording.seconds}
							onDiscard={discard}
							disabled={checking}
						/>
					) : (
						<p className='text-ink-soft'>
							{status === "requesting"
								? "Waiting for microphone access…"
								: "Press record and read the whole sentence aloud, filling in the gap."}
						</p>
					)}
				</div>
			</div>

			{error && (
				<p role='alert' className='mt-3 text-red-pen'>
					{MIC_ERRORS[error]}
				</p>
			)}

			{recording && !isRecording && (
				<button type='button' onClick={onCheck} disabled={checking} className='btn-primary mt-6'>
					{checking ? "Checking your answer…" : "Check my answer"}
				</button>
			)}
		</div>
	);
}

function Playback({
	url,
	seconds,
	onDiscard,
	disabled,
}: {
	url: string;
	seconds: number;
	onDiscard: () => void;
	disabled: boolean;
}) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);

	const toggle = () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (audio.paused) void audio.play();
		else audio.pause();
	};

	return (
		<div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
			<audio
				ref={audioRef}
				src={url}
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onEnded={() => setPlaying(false)}
			/>
			<button type='button' onClick={toggle} className='link'>
				{playing ? "Pause" : "Play back"} your take ({clock(seconds)})
			</button>
			<button type='button' onClick={onDiscard} disabled={disabled} className='link text-ink-soft'>
				Discard
			</button>
		</div>
	);
}
