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

	test("maps attachment failures to actionable wording", () => {
		expect(
			getApiErrorMessage(
				createBackendError(415, "ATTACHMENT_UNSUPPORTED_TYPE"),
			),
		).toContain("PNG, JPEG, WebP, PDF, or ZIP");
		expect(
			getApiErrorMessage(createBackendError(403, "ATTACHMENT_ACCESS_DENIED")),
		).toBe("You do not have permission to work with attachments on this task.");
		expect(
			getApiErrorMessage(createBackendError(400, "ATTACHMENT_FILE_REQUIRED")),
		).toBe("Choose a file to attach.");
		expect(
			getApiErrorMessage(createBackendError(404, "ATTACHMENT_NOT_FOUND")),
		).toBe("That attachment is no longer available.");
	});

	// The server reports the cap in its error details; the message has to render
	// it rather than dropping the number the user needs to resize their file.
	test("renders the server's own size cap", () => {
		expect(
			getApiErrorMessage(
				createBackendError(413, "ATTACHMENT_FILE_TOO_LARGE", {
					maxSizeBytes: 25 * 1024 * 1024,
				}),
			),
		).toBe("The file is too large. The limit is 25 MB.");

		expect(
			getApiErrorMessage(
				createBackendError(413, "ATTACHMENT_FILE_TOO_LARGE", {
					maxSizeBytes: 512 * 1024,
				}),
			),
		).toBe("The file is too large. The limit is 512 KB.");
	});

	test("falls back gracefully when the size cap is absent", () => {
		expect(
			getApiErrorMessage(createBackendError(413, "ATTACHMENT_FILE_TOO_LARGE")),
		).toBe("The file is too large.");
	});

	// A dropped connection during an upload must never read as success, so the
	// message has to name the connection rather than the file.
	test("a network failure during upload blames the connection", () => {
		const offline = new AxiosError("Network Error", "ERR_NETWORK");
		offline.config = { headers: new AxiosHeaders() };

		expect(getApiErrorMessage(offline)).toBe(
			"Unable to upload the file. Check your connection and try again.",
		);
	});
});
