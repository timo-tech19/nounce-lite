import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_RECORDING_SECONDS } from "../../shared/schemas";

/** Chrome and Firefox record webm/opus; Safari records mp4/aac. All are accepted by the transcription API. */
const PREFERRED_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

const EXTENSIONS: Record<string, string> = {
	"audio/webm": "webm",
	"video/webm": "webm",
	"audio/mp4": "mp4",
	"video/mp4": "mp4",
	"audio/x-m4a": "m4a",
	"audio/ogg": "ogg",
	"audio/mpeg": "mp3",
	"audio/wav": "wav",
};

export const extensionFor = (mimeType: string) => EXTENSIONS[mimeType.split(";")[0].trim()] ?? "webm";

const pickMimeType = () =>
	typeof MediaRecorder.isTypeSupported === "function"
		? PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
		: undefined;

export interface Recording {
	blob: Blob;
	url: string;
	filename: string;
	seconds: number;
}

export type RecorderStatus = "idle" | "requesting" | "recording" | "recorded";

export type RecorderError = "unsupported" | "denied" | "no-device" | "failed";

export function useRecorder(maxSeconds = MAX_RECORDING_SECONDS) {
	const [status, setStatus] = useState<RecorderStatus>("idle");
	const [error, setError] = useState<RecorderError | null>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [elapsed, setElapsed] = useState(0);
	const [recording, setRecording] = useState<Recording | null>(null);

	const recorderRef = useRef<MediaRecorder | null>(null);
	const timerRef = useRef<number | undefined>(undefined);
	const startedAtRef = useRef(0);

	const releaseMic = useCallback((s: MediaStream | null) => s?.getTracks().forEach((t) => t.stop()), []);

	const stop = useCallback(() => {
		window.clearInterval(timerRef.current);
		if (recorderRef.current?.state === "recording") recorderRef.current.stop();
	}, []);

	const discard = useCallback(() => {
		setRecording((r) => {
			if (r) URL.revokeObjectURL(r.url);
			return null;
		});
		setElapsed(0);
		setStatus("idle");
	}, []);

	const start = useCallback(async () => {
		setError(null);
		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
			setError("unsupported");
			return;
		}
		discard();
		setStatus("requesting");

		let mic: MediaStream;
		try {
			mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
		} catch (err) {
			const name = err instanceof DOMException ? err.name : "";
			setError(name === "NotAllowedError" ? "denied" : name === "NotFoundError" ? "no-device" : "failed");
			setStatus("idle");
			return;
		}

		const mimeType = pickMimeType();
		const recorder = new MediaRecorder(mic, mimeType ? { mimeType } : undefined);
		const chunks: Blob[] = [];

		recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
		recorder.onstop = () => {
			releaseMic(mic);
			setStream(null);
			const type = recorder.mimeType || mimeType || "audio/webm";
			const blob = new Blob(chunks, { type });
			const seconds = (performance.now() - startedAtRef.current) / 1000;
			setRecording({ blob, url: URL.createObjectURL(blob), filename: `answer.${extensionFor(type)}`, seconds });
			setStatus("recorded");
		};
		recorder.onerror = () => {
			releaseMic(mic);
			setStream(null);
			setError("failed");
			setStatus("idle");
		};

		recorderRef.current = recorder;
		startedAtRef.current = performance.now();
		recorder.start();
		setStream(mic);
		setElapsed(0);
		setStatus("recording");

		timerRef.current = window.setInterval(() => {
			const secs = (performance.now() - startedAtRef.current) / 1000;
			setElapsed(secs);
			if (secs >= maxSeconds) stop();
		}, 100);
	}, [discard, maxSeconds, releaseMic, stop]);

	// Release the microphone if the component unmounts mid-recording.
	useEffect(
		() => () => {
			window.clearInterval(timerRef.current);
			const r = recorderRef.current;
			if (r?.state === "recording") {
				r.onstop = null;
				r.stop();
				releaseMic(r.stream);
			}
		},
		[releaseMic],
	);

	return { status, error, stream, elapsed, maxSeconds, recording, start, stop, discard };
}
