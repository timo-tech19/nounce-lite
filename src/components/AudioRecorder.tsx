import { LiveAudioVisualizer } from "react-audio-visualize";
// import { useAudioRecorder } from "react-audio-voice-recorder";

const formatSeconds = (s: number) =>
	new Date(s * 1000).toISOString().substring(14, 19);

interface Props {
	startRecording: () => void;
	stopRecording: () => void;
	togglePauseResume: () => void;
	recordingBlob?: Blob | undefined;
	isRecording: boolean;
	isPaused: boolean;
	recordingTime: number;
	mediaRecorder?: MediaRecorder | undefined;
}

const AudioRecorder = ({
	isRecording,
	startRecording,
	stopRecording,
	mediaRecorder,
	recordingTime,
}: Props) => {
	return (
		<div>
			<div className='flex flex-col items-center w-full'>
				{isRecording ? (
					<button
						onClick={stopRecording}
						className='mt-10 m-auto flex items-center justify-center bg-red-400 hover:bg-red-500 rounded-full w-20 h-20 focus:outline-none'
					>
						<svg
							className='h-12 w-12 '
							viewBox='0 0 24 24'
							xmlns='http://www.w3.org/2000/svg'
						>
							<path fill='white' d='M6 19h4V5H6v14zm8-14v14h4V5h-4z' />
						</svg>
					</button>
				) : (
					<button
						onClick={startRecording}
						className='mt-10 m-auto flex items-center justify-center bg-teal-400 hover:bg-teal-500 rounded-full w-20 h-20 focus:outline-none'
					>
						<svg
							viewBox='0 0 256 256'
							xmlns='http://www.w3.org/2000/svg'
							className='w-12 h-12 text-white'
						>
							<path
								fill='currentColor'
								d='M128 176a48.05 48.05 0 0 0 48-48V64a48 48 0 0 0-96 0v64a48.05 48.05 0 0 0 48 48ZM96 64a32 32 0 0 1 64 0v64a32 32 0 0 1-64 0Zm40 143.6V232a8 8 0 0 1-16 0v-24.4A80.11 80.11 0 0 1 48 128a8 8 0 0 1 16 0a64 64 0 0 0 128 0a8 8 0 0 1 16 0a80.11 80.11 0 0 1-72 79.6Z'
							/>
						</svg>
					</button>
				)}

				{!isRecording && (
					<p className='text-gray-500 text-sm mt-2'>
						Press to record your answer
					</p>
				)}

				{mediaRecorder && (
					<div className=' bg-slate-100 mt-4 shadow-md p-2 rounded-md'>
						<LiveAudioVisualizer
							mediaRecorder={mediaRecorder}
							width={200}
							height={40}
						/>
						<p className='text-center text-gray-500'>
							{formatSeconds(recordingTime)}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default AudioRecorder;
