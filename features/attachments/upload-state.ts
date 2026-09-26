import type { Attachment } from "./types";

/**
 * Per-file upload state.
 *
 * `uploading` is the only state in which a file is in flight. Nothing is ever
 * added to the list optimistically: an entry appears when the user picks a file
 * and disappears only when the server has confirmed it, so a failed transfer can
 * never leave a phantom attachment behind.
 */
export type UploadStatus =
	| "queued"
	| "uploading"
	| "completed"
	| "failed"
	| "rejected";

export type UploadEntry = {
	/** Stable key for React and for matching a retry back to the same file. */
	key: string;
	fileName: string;
	fileSize: number;
	status: UploadStatus;
	/** 0-100, or `null` when the transfer length is unknown. */
	percent: number | null;
	/** Why this file failed, already mapped to user-facing wording. */
	error: string | null;
	/** The confirmed attachment, present only once the server has stored it. */
	attachment: Attachment | null;
};

/**
 * A file the browser rejected before any request was made.
 *
 * Kept separate from `failed` because nothing was sent: retrying it unchanged
 * would fail identically. The entry exists so the user is told which file in a
 * multi-file selection was the problem.
 */
export function isRejected(status: UploadStatus): boolean {
	return status === "rejected";
}

let keyCounter = 0;

/**
 * A key for one selected file.
 *
 * The name is included so a retry of the same file is recognisable, and a counter
 * keeps two files with the same name distinct.
 */
export function createUploadKey(file: File): string {
	keyCounter += 1;
	return `${file.name}:${String(file.size)}:${String(keyCounter)}`;
}

export function createUploadEntry(
	file: File,
	status: UploadStatus,
	error: string | null = null,
): UploadEntry {
	return {
		key: createUploadKey(file),
		fileName: file.name,
		fileSize: file.size,
		status,
		percent: status === "uploading" ? 0 : null,
		error,
		attachment: null,
	};
}

/** Merges a patch into one entry, leaving the rest of the list untouched. */
export function patchUploadEntry(
	entries: readonly UploadEntry[],
	key: string,
	patch: Partial<UploadEntry>,
): UploadEntry[] {
	return entries.map((entry) =>
		entry.key === key ? { ...entry, ...patch } : entry,
	);
}

export function removeUploadEntry(
	entries: readonly UploadEntry[],
	key: string,
): UploadEntry[] {
	return entries.filter((entry) => entry.key !== key);
}

export function isUploadInFlight(entries: readonly UploadEntry[]): boolean {
	return entries.some(
		(entry) => entry.status === "uploading" || entry.status === "queued",
	);
}

/**
 * A single summary line for the whole selection.
 *
 * Completed entries are cleared from the panel shortly after they land, so this
 * usually reports the work still outstanding rather than the whole history.
 */
export function summarizeUploads(
	entries: readonly UploadEntry[],
): string | null {
	const active = entries.filter(
		(entry) => entry.status === "uploading" || entry.status === "queued",
	).length;
	const failed = entries.filter(
		(entry) => entry.status === "failed" || entry.status === "rejected",
	).length;
	const completed = entries.filter(
		(entry) => entry.status === "completed",
	).length;

	const parts: string[] = [];
	if (active > 0) {
		parts.push(`${String(active)} uploading`);
	}
	if (failed > 0) {
		parts.push(`${String(failed)} failed`);
	}
	if (completed > 0) {
		parts.push(`${String(completed)} uploaded`);
	}

	return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * A file name shortened for display, keeping the extension readable.
 *
 * The panel also carries the full name in a `title` and an accessible label, so
 * truncating here is presentation only and never loses information.
 */
export function truncateFileName(name: string, maxLength = 42): string {
	if (name.length <= maxLength) {
		return name;
	}

	const dotIndex = name.lastIndexOf(".");
	const hasExtension = dotIndex > 0 && name.length - dotIndex <= 12;
	const extension = hasExtension ? name.slice(dotIndex) : "";
	const stem = hasExtension ? name.slice(0, dotIndex) : name;
	// Three characters of ellipsis are part of the budget, not extra.
	const keep = Math.max(1, maxLength - extension.length - 3);

	return `${stem.slice(0, keep)}...${extension}`;
}
