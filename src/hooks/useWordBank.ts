import { useCallback, useEffect, useState } from "react";
import { Word } from "../../shared/schemas";
import { readJSON, writeJSON } from "../lib/storage";

const STORAGE_KEY = "nounce:word-bank";

export const DEFAULT_WORDS = ["serendipity", "ephemeral", "tranquil", "meticulous", "resilient"];

const isWordList = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((w) => typeof w === "string");

export type AddResult = { ok: true } | { ok: false; reason: string };

export function useWordBank() {
	const [words, setWords] = useState<string[]>(() => readJSON(STORAGE_KEY, DEFAULT_WORDS, isWordList));

	useEffect(() => writeJSON(STORAGE_KEY, words), [words]);

	const add = useCallback(
		(input: string): AddResult => {
			const parsed = Word.safeParse(input);
			if (!parsed.success) return { ok: false, reason: parsed.error.issues[0].message };
			const word = parsed.data.toLowerCase().replace(/\s+/g, " ");
			if (words.includes(word)) return { ok: false, reason: `“${word}” is already in your word bank.` };
			setWords((current) => [...current, word]);
			return { ok: true };
		},
		[words],
	);

	const remove = useCallback((word: string) => setWords((current) => current.filter((w) => w !== word)), []);

	const reset = useCallback(() => setWords(DEFAULT_WORDS), []);

	return { words, add, remove, reset };
}
