/** Picks a random word, avoiding an immediate repeat when there's a choice. */
export const pickWord = (words: string[], previous?: string) => {
	const pool = words.length > 1 ? words.filter((w) => w !== previous) : words;
	return pool[Math.floor(Math.random() * pool.length)];
};
