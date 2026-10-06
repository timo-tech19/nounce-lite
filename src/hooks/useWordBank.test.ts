import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WORDS, useWordBank } from "./useWordBank";

const KEY = "nounce:word-bank";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useWordBank", () => {
	it("starts with the default words and persists changes across reloads", () => {
		const first = renderHook(() => useWordBank());
		expect(first.result.current.words).toEqual(DEFAULT_WORDS);

		act(() => void first.result.current.add("  Ubiquitous "));
		act(() => first.result.current.remove("tranquil"));
		first.unmount();

		const second = renderHook(() => useWordBank());
		expect(second.result.current.words).toContain("ubiquitous");
		expect(second.result.current.words).not.toContain("tranquil");
	});

	it("ignores duplicates and blanks, and says why", () => {
		const { result } = renderHook(() => useWordBank());
		let outcome: ReturnType<typeof result.current.add> | undefined;

		act(() => void (outcome = result.current.add("Serendipity")));
		expect(outcome).toEqual({ ok: false, reason: expect.stringMatching(/already in your word bank/) });

		act(() => void (outcome = result.current.add("   ")));
		expect(outcome).toMatchObject({ ok: false });
		expect(result.current.words).toEqual(DEFAULT_WORDS);
	});

	it("falls back to the defaults when stored data is corrupt", () => {
		localStorage.setItem(KEY, '{"not":"a list"');
		expect(renderHook(() => useWordBank()).result.current.words).toEqual(DEFAULT_WORDS);
	});

	it("keeps working when storage is unavailable", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new DOMException("blocked", "SecurityError");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("full", "QuotaExceededError");
		});
		const { result } = renderHook(() => useWordBank());
		act(() => void result.current.add("ubiquitous"));
		expect(result.current.words).toContain("ubiquitous");
	});
});
