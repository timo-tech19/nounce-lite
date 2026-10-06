import { useCallback, useEffect, useState } from "react";
import { readJSON, writeJSON } from "../lib/storage";

const STORAGE_KEY = "nounce:stats";

export interface SessionStats {
	rounds: number;
	totalScore: number;
	/** Most recent score per word, so the word bank can show progress. */
	lastScores: Record<string, number>;
}

const EMPTY: SessionStats = { rounds: 0, totalScore: 0, lastScores: {} };

const isStats = (value: unknown): value is SessionStats =>
	typeof value === "object" &&
	value !== null &&
	typeof (value as SessionStats).rounds === "number" &&
	typeof (value as SessionStats).totalScore === "number" &&
	typeof (value as SessionStats).lastScores === "object";

export function useSessionStats() {
	const [stats, setStats] = useState<SessionStats>(() => readJSON(STORAGE_KEY, EMPTY, isStats));

	useEffect(() => writeJSON(STORAGE_KEY, stats), [stats]);

	const record = useCallback((word: string, score: number) => {
		setStats((s) => ({
			rounds: s.rounds + 1,
			totalScore: s.totalScore + score,
			lastScores: { ...s.lastScores, [word]: score },
		}));
	}, []);

	const average = stats.rounds ? stats.totalScore / stats.rounds : null;

	return { stats, average, record };
}
