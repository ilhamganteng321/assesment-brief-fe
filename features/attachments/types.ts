/**
 * Attachment contracts, mirrored from the backend attachment module.
 *
 * The server owns the allow-list. `ATTACHMENT_MIME_TYPES` exists so the file
 * picker can pre-filter and so an obviously wrong file is explained before a
 * request is made, but the upload is validated against magic bytes on the
 * server regardless of what the browser reported.
 */
export const ATTACHMENT_MIME_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"application/pdf",
	"application/zip",
] as const;

export type AttachmentMimeType = (typeof ATTACHMENT_MIME_TYPES)[number];

/** Mirrors the server's `MAX_UPLOAD_SIZE_MB`. */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export type Attachment = {
	id: string;
	taskId: string;
	fileName: string;
	mimeType: string;
	fileSize: number;
	createdAt: string;
	uploadedBy: {
		id: string;
		name: string;
	};
};

export type AttachmentList = {
	attachments: Attachment[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

const MIME_LABELS: Record<string, string> = {
	"image/png": "PNG image",
	"image/jpeg": "JPEG image",
	"image/webp": "WebP image",
	"application/pdf": "PDF document",
	"application/zip": "ZIP archive",
};

export function getAttachmentMimeLabel(mimeType: string): string {
	return MIME_LABELS[mimeType] ?? mimeType;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${String(bytes)} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The `accept` attribute for a file input limited to the server allow-list.
 */
export const ATTACHMENT_ACCEPT_ATTRIBUTE = [
	...ATTACHMENT_MIME_TYPES,
	".png",
	".jpg",
	".jpeg",
	".webp",
	".pdf",
	".zip",
].join(",");

/**
 * Whether a preview can be shown inline.
 *
 * Images render as a thumbnail and a PDF as an embedded frame. Anything else —
 * a ZIP, for instance — has no useful inline representation, so the UI offers
 * download only and says so rather than showing a broken frame.
 */
export function canPreviewInline(mimeType: string): boolean {
	return (
		mimeType === "image/png" ||
		mimeType === "image/jpeg" ||
		mimeType === "image/webp" ||
		mimeType === "application/pdf"
	);
}

export function isImageAttachment(mimeType: string): boolean {
	return (
		mimeType === "image/png" ||
		mimeType === "image/jpeg" ||
		mimeType === "image/webp"
	);
}

export type PreviewKind = "image" | "pdf" | "none";

export function getPreviewKind(mimeType: string): PreviewKind {
	if (isImageAttachment(mimeType)) {
		return "image";
	}
	return mimeType === "application/pdf" ? "pdf" : "none";
}

/**
 * Client-side pre-flight for the upload form.
 *
 * This exists to avoid a pointless round trip and to explain a problem in the
 * user's language. It is not the enforcement point: the server re-derives the
 * type from the file's magic bytes, and an empty or oversized file is rejected
 * there even if it passes these checks.
 *
 * A file whose type the browser reports as unknown is deliberately *not* blocked.
 * Browsers label plenty of legitimate files `application/octet-stream`, and the
 * server can identify those from their contents; refusing them here would reject
 * files the API would have accepted.
 */
export function validateAttachmentFile(file: {
	name: string;
	type: string;
	size: number;
}): string | null {
	if (file.size === 0) {
		return "The file is empty.";
	}
	if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
		return `The file must be ${String(
			MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024),
		)} MB or smaller.`;
	}
	if (isUnknownBrowserType(file.type)) {
		return null;
	}
	if (!(ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
		return `${getAttachmentMimeLabel(file.type)} files are not accepted. Upload a PNG, JPEG, WebP, PDF, or ZIP.`;
	}
	return null;
}

/**
 * Whether the browser declined to name a type.
 *
 * Treated as "let the server decide" rather than as a rejection, because the
 * server identifies the type from the bytes and an unrecognised label says
 * nothing about whether the file is acceptable.
 */
function isUnknownBrowserType(type: string): boolean {
	return (
		type.length === 0 ||
		type === "application/octet-stream" ||
		type === "binary/octet-stream"
	);
}
