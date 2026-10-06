import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BLANK } from "../../shared/cloze";
import BlankSentence, { type BlankState } from "./BlankSentence";

const renderSentence = (state: BlankState) =>
	render(
		<p data-testid='sentence'>
			<BlankSentence blankedSentence={`The lake was ${BLANK} at dawn.`} answer='tranquil' state={state} />
		</p>,
	);

describe("BlankSentence", () => {
	it("hides the word behind an accessible blank", () => {
		renderSentence("hidden");
		expect(screen.getByTestId("sentence")).toHaveTextContent("The lake was at dawn.");
		expect(screen.queryByText("tranquil")).not.toBeInTheDocument();
		expect(screen.getByRole("img", { name: "blank" })).toBeInTheDocument();
	});

	it.each(["revealed", "correct"] as const)("shows the word when %s", (state) => {
		renderSentence(state);
		expect(screen.getByTestId("sentence")).toHaveTextContent("The lake was tranquil at dawn.");
		expect(screen.getByText("tranquil").tagName).toBe("MARK");
	});

	it("keeps the word hidden and marks the gap after a wrong answer", () => {
		renderSentence("incorrect");
		expect(screen.queryByText("tranquil")).not.toBeInTheDocument();
		expect(screen.getByRole("img", { name: /not yet answered correctly/ })).toHaveAttribute("data-state", "incorrect");
	});

	it("renders a sentence with no blank unchanged", () => {
		render(
			<p data-testid='sentence'>
				<BlankSentence blankedSentence='No gap here.' answer='tranquil' state='hidden' />
			</p>,
		);
		expect(screen.getByTestId("sentence")).toHaveTextContent("No gap here.");
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});
});
