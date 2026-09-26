import { describe, expect, test } from "bun:test";
import { AxiosError, AxiosHeaders } from "axios";

import {
	getApiErrorMessage,
	isConcurrentModificationError,
	normalizeApiError,
	shouldInvalidateSession,
} from "../lib/api/error";

function createBackendError(status, code, extra = {}) {
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
					...extra,
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

	test("recognises a version conflict as recoverable", () => {
		const conflict = createBackendError(409, "CONCURRENT_MODIFICATION", {
			resourceId: "task-1",
			taskId: "task-1",
			expectedVersion: 1,
			currentVersion: 2,
			latestTask: { id: "task-1", version: 2 },
		});

		expect(isConcurrentModificationError(conflict)).toBe(true);
		expect(normalizeApiError(conflict).details).toEqual({
			resourceId: "task-1",
			taskId: "task-1",
			expectedVersion: 1,
			currentVersion: 2,
			latestTask: { id: "task-1", version: 2 },
		});
	});

	test("keeps the refetched version available for the retry", () => {
		const conflict = createBackendError(409, "CONCURRENT_MODIFICATION", {
			currentVersion: 7,
		});

		expect(normalizeApiError(conflict).details.currentVersion).toBe(7);
	});

	test("does not treat other failures as version conflicts", () => {
		expect(
			isConcurrentModificationError(createBackendError(409, "TASK_BLOCKED")),
		).toBe(false);
		expect(
			isConcurrentModificationError(createBackendError(404, "TASK_NOT_FOUND")),
		).toBe(false);
	});

	test("shows the server's conflict message instead of a generic one", () => {
		const conflict = createBackendError(409, "CONCURRENT_MODIFICATION", {
			message:
				"This task has been modified by another user. Please refresh and try again.",
		});

		expect(getApiErrorMessage(conflict)).toBe(
			"This task has been modified by another user. Please refresh and try again.",
		);
	});
});
