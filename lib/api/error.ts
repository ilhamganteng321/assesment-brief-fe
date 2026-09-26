import axios, { type AxiosError } from "axios";

import {
	ApiError,
	type ApiErrorDetails,
	type ApiFailureResponse,
} from "./types";

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

export function shouldInvalidateSession(error: unknown): boolean {
	const apiError = normalizeApiError(error);
	return apiError.status === 401 && apiError.code !== "INVALID_CREDENTIALS";
}
