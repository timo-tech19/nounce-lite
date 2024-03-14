import { Fragment } from "react/jsx-runtime";

interface Props {
	sentence: string;
	word: string;
	show: boolean;
	transcription: string;
}

const BlankSetence = ({ sentence, word, show, transcription }: Props) => {
	const parts = sentence.split(word);
	return parts.map((part, index) => {
		return (
			<Fragment key={index}>
				{part}
				{index === parts.length - 1 ? (
					""
				) : (
					<>
						{show && (
							<span className='inline-block bg-yellow-200 p-1 rounded-md font-semibold'>
								{word}
							</span>
						)}
						{!show && !transcription && (
							<span className='inline-block w-16 border-b-2 border-black'></span>
						)}
						{transcription.includes(word) && !show && (
							<span className='inline-block bg-green-200 p-1 rounded-md font-semibold'>
								{word}
							</span>
						)}
						{transcription && !transcription.includes(word) && !show && (
							<span className='inline-block w-16 bg-red-200 text-red-600 p-1 rounded-md'>
								_________
							</span>
						)}
					</>
				)}
			</Fragment>
		);
	});
};

export default BlankSetence;
