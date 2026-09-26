import { describe, expect, test } from "bun:test";
import { AxiosError, AxiosHeaders } from "axios";

import {
	getApiErrorMessage,
	normalizeApiError,
	shouldInvalidateSession,
} from "../lib/api/error";

function createBackendError(status, code) {
	return new AxiosError(
		"Request failed",
		"ERR_BAD_RESPONSE",
		undefined,
		undefined,
		{
			data: {
				success: false,
				error: {
					code,
					message: "Backend message",
					requestId: "3c9a1e8a-6d5b-4f21-9c3f-8f0d1a2b3c4d",
				},
			},
			status,
			statusText: "Backend error",
			headers: {},
			config: { headers: new AxiosHeaders() },
		},
	);
}

describe("API error handling", () => {
	test("normalizes the backend error envelope", () => {
		const error = normalizeApiError(createBackendError(400, "INVALID_REQUEST"));

		expect(error.status).toBe(400);
		expect(error.code).toBe("INVALID_REQUEST");
		expect(error.requestId).toBe("3c9a1e8a-6d5b-4f21-9c3f-8f0d1a2b3c4d");
	});

	test("invalidates only an invalid authenticated session", () => {
		expect(
			shouldInvalidateSession(createBackendError(401, "UNAUTHORIZED")),
		).toBe(true);
		expect(
			shouldInvalidateSession(createBackendError(401, "INVALID_CREDENTIALS")),
		).toBe(false);
		expect(shouldInvalidateSession(createBackendError(403, "FORBIDDEN"))).toBe(
			false,
		);
	});

	test("provides user-safe credential errors", () => {
		expect(
			getApiErrorMessage(createBackendError(401, "INVALID_CREDENTIALS")),
		).toBe("Invalid email or password.");
	});
});
