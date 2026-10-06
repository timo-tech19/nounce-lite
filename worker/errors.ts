import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode, ErrorResponse } from "../shared/schemas";

/** An error that is safe to show to the user, rendered as `{ error: { code, message } }`. */
export class ApiError extends Error {
	readonly status: ContentfulStatusCode;
	readonly code: ErrorCode;

	constructor(status: ContentfulStatusCode, code: ErrorCode, message: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
	}

	toJSON(): ErrorResponse {
		return { error: { code: this.code, message: this.message } };
	}
}

export const badRequest = (message: string) => new ApiError(400, "bad_request", message);
