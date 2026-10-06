import { useCallback, useEffect, useState } from "react";

const supported = typeof window !== "undefined" && "speechSynthesis" in window;

/** Reads text aloud with the browser's built-in voices. Free, offline, and no API call. */
export function useSpeech() {
	const [speaking, setSpeaking] = useState(false);

	useEffect(() => () => (supported ? speechSynthesis.cancel() : undefined), []);

	const speak = useCallback((text: string) => {
		if (!supported) return;
		speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = "en-GB";
		utterance.rate = 0.92;
		utterance.onend = utterance.onerror = () => setSpeaking(false);
		setSpeaking(true);
		speechSynthesis.speak(utterance);
	}, []);

	const stop = useCallback(() => {
		if (supported) speechSynthesis.cancel();
		setSpeaking(false);
	}, []);

	return { supported, speaking, speak, stop };
}
