import { describe, expect, it } from "vitest";
import { BLANK, blankSentence, containsWord, normalize } from "./cloze";

describe("normalize", () => {
	it("ignores case, punctuation and curly apostrophes", () => {
		expect(normalize("  Serendipity!  It’s  ")).toBe("serendipity it's");
	});
});

describe("containsWord", () => {
	it("matches a whole word regardless of case and punctuation", () => {
		expect(containsWord("What a Serendipity, really.", "serendipity")).toBe(true);
	});

	it("does not match a longer word that starts with the target", () => {
		expect(containsWord("It was serendipitous.", "serendipity")).toBe(false);
		expect(containsWord("The scenery was tranquillity itself.", "tranquil")).toBe(false);
	});

	it("handles multi-word and hyphenated targets", () => {
		expect(containsWord("She was well-known in town.", "well-known")).toBe(true);
		expect(containsWord("She was known in town.", "well-known")).toBe(false);
		expect(containsWord("We need to carry out the plan.", "carry out")).toBe(true);
	});
});

describe("blankSentence", () => {
	it("blanks the first whole-word match and keeps the sentence's capitalisation", () => {
		expect(blankSentence("Ephemeral joys are still joys.", "ephemeral")).toEqual({
			blanked: `${BLANK} joys are still joys.`,
			answer: "Ephemeral",
		});
	});

	it("skips partial matches inside other words", () => {
		expect(blankSentence("Artful art is art.", "art")).toEqual({ blanked: `Artful ${BLANK} is art.`, answer: "art" });
	});

	it("returns null when the word isn't there", () => {
		expect(blankSentence("Nothing to see here.", "serendipity")).toBeNull();
		expect(blankSentence("Anything.", "  ")).toBeNull();
	});

	it("treats regex characters in the word literally", () => {
		expect(blankSentence("Is a.b here?", "a.b")?.answer).toBe("a.b");
		expect(blankSentence("Is axb here?", "a.b")).toBeNull();
	});
});
