import { describe, expect, test } from "bun:test";

import {
	ATTACHMENT_MIME_TYPES,
	formatFileSize,
	getAttachmentMimeLabel,
	MAX_ATTACHMENT_SIZE_BYTES,
	validateAttachmentFile,
} from "../features/attachments/types.ts";

const PNG_BYTES = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

describe("attachment file validation", () => {
	test("accepts every type on the server allow-list", () => {
		for (const type of ATTACHMENT_MIME_TYPES) {
			expect(
				validateAttachmentFile({ name: "file", type, size: 1024 }),
			).toBeNull();
		}
	});

	test("rejects an empty file", () => {
		expect(
			validateAttachmentFile({ name: "empty.png", type: "image/png", size: 0 }),
		).toBe("The file is empty.");
	});

	test("rejects a file over the size limit", () => {
		const problem = validateAttachmentFile({
			name: "huge.png",
			type: "image/png",
			size: MAX_ATTACHMENT_SIZE_BYTES + 1,
		});

		expect(problem).toContain("10 MB or smaller");
	});

	test("rejects a type the server will not store", () => {
		const problem = validateAttachmentFile({
			name: "notes.txt",
			type: "text/plain",
			size: 10,
		});

		expect(problem).toContain("not accepted");
		expect(problem).toContain("PNG");
	});

	// The pre-flight is a convenience, not the enforcement point: the server
	// re-derives the type from magic bytes, so a mislabelled but otherwise
	// allow-listed file still has to be let through to be judged there.
	test("lets an allow-listed type reach the server even if the bytes disagree", () => {
		expect(
			validateAttachmentFile({
				name: "actually-a-png.png",
				type: "image/png",
				size: PNG_BYTES.length,
			}),
		).toBeNull();
	});
});

describe("attachment formatting", () => {
	test("labels every allowed mime type", () => {
		expect(ATTACHMENT_MIME_TYPES.map(getAttachmentMimeLabel)).toEqual([
			"PNG image",
			"JPEG image",
			"WebP image",
			"PDF document",
			"ZIP archive",
		]);
	});

	test("falls back to the raw type for an unknown one", () => {
		expect(getAttachmentMimeLabel("application/x-tar")).toBe(
			"application/x-tar",
		);
	});

	test("scales the file size to a readable unit", () => {
		expect(formatFileSize(512)).toBe("512 B");
		expect(formatFileSize(2048)).toBe("2.0 KB");
		expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
	});
});
