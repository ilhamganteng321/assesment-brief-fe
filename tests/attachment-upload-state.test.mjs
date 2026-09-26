import { describe, expect, test } from "bun:test";

import {
	canPreviewInline,
	formatFileSize,
	getPreviewKind,
	MAX_ATTACHMENT_SIZE_BYTES,
	validateAttachmentFile,
} from "../features/attachments/types.ts";
import {
	createUploadEntry,
	isUploadInFlight,
	patchUploadEntry,
	removeUploadEntry,
	summarizeUploads,
	truncateFileName,
} from "../features/attachments/upload-state.ts";

function file(name, size, type = "image/png") {
	return new File([new Uint8Array(size)], name, { type });
}

describe("preview support", () => {
	test("previews images and pdfs inline", () => {
		expect(getPreviewKind("image/png")).toBe("image");
		expect(getPreviewKind("image/jpeg")).toBe("image");
		expect(getPreviewKind("image/webp")).toBe("image");
		expect(getPreviewKind("application/pdf")).toBe("pdf");
	});

	// A zip has no inline representation, so the UI says so instead of rendering
	// an empty frame.
	test("offers no inline preview for an archive", () => {
		expect(getPreviewKind("application/zip")).toBe("none");
		expect(canPreviewInline("application/zip")).toBe(false);
		expect(canPreviewInline("image/png")).toBe(true);
	});
});

describe("file size formatting", () => {
	test("scales to a readable unit", () => {
		expect(formatFileSize(0)).toBe("0 B");
		expect(formatFileSize(512)).toBe("512 B");
		expect(formatFileSize(1024)).toBe("1.0 KB");
		expect(formatFileSize(1048576)).toBe("1.0 MB");
		expect(formatFileSize(1536)).toBe("1.5 KB");
	});
});

describe("file name truncation", () => {
	test("leaves a short name alone", () => {
		expect(truncateFileName("design.png")).toBe("design.png");
	});

	test("keeps the extension readable on a long name", () => {
		const long = "very-long-project-design-document-final-version-v3.pdf";
		const result = truncateFileName(long);

		expect(result.endsWith(".pdf")).toBe(true);
		expect(result).toContain("...");
		expect(result.length).toBeLessThanOrEqual(42);
	});

	// Truncation is presentation only: the panel also carries the full value in a
	// title and an accessible label, so nothing is actually lost.
	test("a name with no extension still shortens", () => {
		const result = truncateFileName("a".repeat(80), 20);

		expect(result).toContain("...");
		expect(result.length).toBeLessThanOrEqual(20);
	});

	// A budget smaller than the extension cannot be honoured: the result keeps the
	// extension plus at least one character of the stem, so a file is never
	// reduced to an ellipsis with no indication of what it is.
	test("never truncates away the extension or the whole stem", () => {
		const result = truncateFileName("short.png", 4);

		expect(result.endsWith(".png")).toBe(true);
		expect(result).toContain("...");
		expect(result).toBe("s....png");
	});
});

describe("upload entries", () => {
	test("a new entry starts queued with no progress", () => {
		const entry = createUploadEntry(file("a.png", 10), "queued");

		expect(entry.status).toBe("queued");
		expect(entry.percent).toBeNull();
		expect(entry.attachment).toBeNull();
	});

	test("keys are unique even for the same file twice", () => {
		const same = file("a.png", 10);
		const first = createUploadEntry(same, "queued");
		const second = createUploadEntry(same, "queued");

		expect(first.key).not.toBe(second.key);
	});

	test("patching one entry leaves the rest untouched", () => {
		const first = createUploadEntry(file("a.png", 10), "queued");
		const second = createUploadEntry(file("b.png", 10), "queued");

		const patched = patchUploadEntry([first, second], first.key, {
			status: "uploading",
			percent: 42,
		});

		expect(patched[0].status).toBe("uploading");
		expect(patched[0].percent).toBe(42);
		expect(patched[1].status).toBe("queued");
		expect(patched[1].percent).toBeNull();
	});

	test("removing an entry drops only that one", () => {
		const first = createUploadEntry(file("a.png", 10), "completed");
		const second = createUploadEntry(file("b.png", 10), "completed");

		const remaining = removeUploadEntry([first, second], first.key);

		expect(remaining).toHaveLength(1);
		expect(remaining[0].key).toBe(second.key);
	});

	test("in-flight work blocks a second round of uploads", () => {
		const queued = createUploadEntry(file("a.png", 10), "queued");
		const done = createUploadEntry(file("b.png", 10), "completed");
		const failed = createUploadEntry(file("c.png", 10), "failed");

		expect(isUploadInFlight([done, failed])).toBe(false);
		expect(isUploadInFlight([done, queued])).toBe(true);
	});

	test("the summary counts each outcome", () => {
		const entries = [
			createUploadEntry(file("a.png", 10), "uploading"),
			createUploadEntry(file("b.png", 10), "failed"),
			createUploadEntry(file("c.png", 10), "completed"),
		];

		expect(summarizeUploads(entries)).toBe(
			"1 uploading · 1 failed · 1 uploaded",
		);
		expect(summarizeUploads([])).toBeNull();
	});
});

describe("pre-flight validation", () => {
	test("accepts a file on the allow-list", () => {
		expect(
			validateAttachmentFile({ name: "a.png", type: "image/png", size: 100 }),
		).toBeNull();
	});

	test("rejects an empty file", () => {
		expect(
			validateAttachmentFile({ name: "a.png", type: "image/png", size: 0 }),
		).toBe("The file is empty.");
	});

	test("rejects a file over the size cap", () => {
		expect(
			validateAttachmentFile({
				name: "big.png",
				type: "image/png",
				size: MAX_ATTACHMENT_SIZE_BYTES + 1,
			}),
		).toContain("10 MB or smaller");
	});

	test("rejects a type the server will not store", () => {
		expect(
			validateAttachmentFile({
				name: "a.txt",
				type: "text/plain",
				size: 10,
			}),
		).toContain("not accepted");
	});

	// The server identifies a file from its magic bytes, and a browser labels
	// plenty of legitimate files `application/octet-stream`. Blocking those here
	// would reject files the API would have accepted, so an unknown label is
	// deferred to the server rather than treated as a rejection.
	test("defers an unrecognised browser type to the server", () => {
		for (const type of [
			"",
			"application/octet-stream",
			"binary/octet-stream",
		]) {
			expect(
				validateAttachmentFile({ name: "a.bin", type, size: 100 }),
			).toBeNull();
		}
	});

	// The size and emptiness checks still apply to a deferred file: those are not
	// questions about the type.
	test("still applies the size and emptiness rules to a deferred type", () => {
		expect(
			validateAttachmentFile({
				name: "a.bin",
				type: "application/octet-stream",
				size: 0,
			}),
		).toBe("The file is empty.");
		expect(
			validateAttachmentFile({
				name: "a.bin",
				type: "application/octet-stream",
				size: MAX_ATTACHMENT_SIZE_BYTES + 1,
			}),
		).toContain("10 MB or smaller");
	});
});
