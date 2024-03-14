export const convertToFileExtension = async (
	webmBlob: Blob,
	downloadFileExtension: string
): Promise<Blob> => {
	const FFmpeg = await import("@ffmpeg/ffmpeg");
	const ffmpeg = FFmpeg.createFFmpeg({ log: false });
	await ffmpeg.load();

	const inputName = "input.webm";
	const outputName = `output.${downloadFileExtension}`;

	ffmpeg.FS(
		"writeFile",
		inputName,
		new Uint8Array(await webmBlob.arrayBuffer())
	);

	await ffmpeg.run("-i", inputName, outputName);

	const outputData = ffmpeg.FS("readFile", outputName);
	const outputBlob = new Blob([outputData.buffer], {
		type: `audio/${downloadFileExtension}`,
	});

	return outputBlob;
};
