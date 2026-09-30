import axios, { type AxiosError } from "axios";

import {
	ApiError,
	type ApiErrorDetails,
	type ApiFailureResponse,
} from "./types";

/** Server error code for a lost optimistic-lock race. */
export const CONCURRENT_MODIFICATION_CODE = "CONCURRENT_MODIFICATION";

/** Server error code for a project lifecycle move that is not permitted. */
export const INVALID_PROJECT_STATUS_TRANSITION_CODE =
	"INVALID_PROJECT_STATUS_TRANSITION";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isApiFailureResponse(value: unknown): value is ApiFailureResponse {
	if (!isRecord(value) || value.success !== false || !isRecord(value.error)) {
		return false;
	}

	return (
		typeof value.error.code === "string" &&
		typeof value.error.message === "string"
	);
}

function getErrorDetails(
	payload: ApiFailureResponse["error"],
): ApiErrorDetails {
	return Object.fromEntries(
		Object.entries(payload).filter(
			([key]) => key !== "code" && key !== "message" && key !== "requestId",
		),
	);
}

function getNetworkError(error: AxiosError): ApiError {
	if (error.code === "ECONNABORTED") {
		return new ApiError(
			"The server took too long to respond. Please try again.",
			{
				code: "REQUEST_TIMEOUT",
			},
		);
	}

	return new ApiError("Unable to connect to the server. Please try again.", {
		code: "NETWORK_ERROR",
	});
}

export function normalizeApiError(error: unknown): ApiError {
	if (error instanceof ApiError) {
		return error;
	}

	if (!axios.isAxiosError<unknown>(error)) {
		return new ApiError("Something went wrong. Please try again.", {
			code: "UNKNOWN_ERROR",
		});
	}

	if (!error.response) {
		return getNetworkError(error);
	}

	if (isApiFailureResponse(error.response.data)) {
		const payload = error.response.data.error;
		return new ApiError(payload.message, {
			status: error.response.status,
			code: payload.code,
			requestId: payload.requestId,
			details: getErrorDetails(payload),
		});
	}

	return new ApiError("The server returned an invalid response.", {
		status: error.response.status,
		code: "INVALID_RESPONSE",
	});
}

export function getApiErrorMessage(error: unknown): string {
	const apiError = normalizeApiError(error);

	switch (apiError.code) {
		case "INVALID_CREDENTIALS":
			return "Invalid email or password.";
		case "UNAUTHORIZED":
			return "Your session has expired. Please sign in again.";
		case "RATE_LIMITED":
			return "Too many attempts. Please wait a moment and try again.";
		case CONCURRENT_MODIFICATION_CODE:
			// The server already explained it, and the caller refetches the task
			// so the form is rebuilt from the row that actually won.
			return (
				apiError.message ||
				"This item was been changed by someone else. The latest version has been loaded."
			);
		case INVALID_PROJECT_STATUS_TRANSITION_CODE:
			// A refused lifecycle move is a conflict the caller can act on, and the
			// server's message already names both ends of it. A stale client offering
			// a step that is no longer available — someone else completed the project
			// a moment earlier — reads better with the refetch suggested than with a
			// bare rejection, so the fallback names the next step.
			return (
				apiError.message ||
				"That change is not available from this project's current status. The latest project has been loaded."
			);
		default:
			break;
	}

	// Attachment failures get wording a person can act on. The server's own
	// message is used as the fallback, so a code added later still reads sensibly
	// rather than disappearing behind a generic string.
	switch (apiError.code) {
		case "ATTACHMENT_UNSUPPORTED_TYPE":
			return "That file type is not supported. Upload a PNG, JPEG, WebP, PDF, or ZIP.";
		case "ATTACHMENT_FILE_TOO_LARGE": {
			const maxSizeBytes = apiError.details?.maxSizeBytes;
			return typeof maxSizeBytes === "number" && maxSizeBytes > 0
				? `The file is too large. The limit is ${formatByteLimit(maxSizeBytes)}.`
				: "The file is too large.";
		}
		case "ATTACHMENT_FILE_REQUIRED":
			return "Choose a file to attach.";
		case "ATTACHMENT_INVALID_FILE_NAME":
			return "That file name cannot be used. Rename the file and try again.";
		case "ATTACHMENT_ACCESS_DENIED":
			return "You do not have permission to work with attachments on this task.";
		case "ATTACHMENT_NOT_FOUND":
			return "That attachment is no longer available.";
		case "ATTACHMENT_ALREADY_DELETED":
			return "That attachment has already been removed.";
		case "ATTACHMENT_STORAGE_ERROR":
			return "The file could not be stored. Please try again.";
		case "NETWORK_ERROR":
			return "Unable to upload the file. Check your connection and try again.";
		case "REQUEST_TIMEOUT":
			return "The upload took too long. Check your connection and try again.";
		default:
			break;
	}

	if (
		apiError.status === 0 ||
		apiError.status === 502 ||
		apiError.status === 503
	) {
		return "Unable to connect to the server. Please try again.";
	}

	return apiError.message || "Something went wrong. Please try again.";
}

/** The server reports the byte cap in its error details; render it in MB or KB. */
function formatByteLimit(bytes: number): string {
	const megabytes = bytes / (1024 * 1024);
	return Number.isInteger(megabytes)
		? `${String(megabytes)} MB`
		: `${String(Math.round(bytes / 1024))} KB`;
}

/**
 * A version conflict means this client's copy of the row is stale, so the only
 * correct response is to refetch rather than to resend the rejected write.
 */
export function isConcurrentModificationError(error: unknown): boolean {
	return normalizeApiError(error).code === CONCURRENT_MODIFICATION_CODE;
}

export function shouldInvalidateSession(error: unknown): boolean {
	const apiError = normalizeApiError(error);
	return apiError.status === 401 && apiError.code !== "INVALID_CREDENTIALS";
}
