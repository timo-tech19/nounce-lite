/** Marker that stands in for the hidden word in a blanked sentence. */
export const BLANK = "_____";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches `form` as a whole word, ignoring case. Hyphens and apostrophes count as part of a word. */
const wholeWord = (form: string) =>
	new RegExp(`(?<![\\p{L}\\p{N}'’-])${escapeRegExp(form)}(?![\\p{L}\\p{N}'’-])`, "iu");

/**
 * Lowercases, unifies apostrophes, drops punctuation and collapses whitespace,
 * so "Serendipity!" and "serendipity" compare equal.
 */
export const normalize = (text: string) =>
	text
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[’‘]/g, "'")
		.replace(/[^\p{L}\p{N}'\s-]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();

/** True when `word` appears in `text` as a whole word (not as part of a longer word). */
export const containsWord = (text: string, word: string) => wholeWord(normalize(word)).test(normalize(text));

/**
 * Replaces the first whole-word occurrence of `form` with {@link BLANK}, and returns
 * the text it replaced (with the sentence's own capitalisation). Null when it's absent.
 */
export const blankSentence = (sentence: string, form: string): { blanked: string; answer: string } | null => {
	const trimmed = form.trim();
	if (!trimmed) return null;
	const match = wholeWord(trimmed).exec(sentence);
	if (!match) return null;
	const end = match.index + match[0].length;
	return { blanked: sentence.slice(0, match.index) + BLANK + sentence.slice(end), answer: match[0] };
};
