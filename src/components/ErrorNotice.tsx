import type { RequestError } from "../lib/api";

interface Props {
	error: RequestError;
	onRetry?: () => void;
}

const TITLES: Partial<Record<RequestError["code"], string>> = {
	rate_limited: "Demo limit reached",
	network: "You're offline",
	upstream_unavailable: "The AI service isn't responding",
	payload_too_large: "That recording is too long",
	bad_request: "That didn't look right",
};

/** Inline error with a plain-language reason and, where it can help, a retry button. */
export default function ErrorNotice({ error, onRetry }: Props) {
	// Retrying won't help until the daily limit resets.
	const canRetry = onRetry && error.code !== "rate_limited";

	return (
		<div role='alert' className='mt-6 border-l-2 border-red-pen pl-4'>
			<p className='font-semibold text-red-pen'>{TITLES[error.code] ?? "Something went wrong"}</p>
			<p className='mt-0.5 text-ink-soft'>{error.message}</p>
			{canRetry && (
				<button type='button' onClick={onRetry} className='btn-secondary mt-3'>
					Try again
				</button>
			)}
		</div>
	);
}
