import type { Attachment } from "@/features/attachments/types";

import type { TaskAuditLog } from "./types";

/**
 * One line in the task timeline.
 *
 * The timeline merges two sources the server already authorised: the audit log
 * for field-level changes, and the attachment list for uploads. Both carry a
 * timestamp and an actor, so they can sit in one chronology. Nothing is written
 * from the browser — the audit log stays read-only, and an upload simply shows up
 * because the attachment exists.
 */
export type TimelineEntry = {
	/** Unique across both sources, so React keys never collide. */
	key: string;
	kind: "field-change" | "attachment-added";
	at: string;
	/** Column name for a field change, or the file name for an attachment. */
	subject: string;
	oldValue: string | null;
	newValue: string | null;
};

export type TimelineGroup = {
	/** Stable key for the group heading. */
	key: string;
	/** "Today", "Yesterday", or a formatted date. */
	label: string;
	entries: TimelineEntry[];
};

function toTime(value: string): number {
	const time = new Date(value).getTime();
	return Number.isNaN(time) ? 0 : time;
}

/**
 * A day bucket key in the caller's own timezone.
 *
 * Comparing calendar days has to happen in local time: an entry at 23:30 local
 * belongs to that date for the person reading it, even if the server stored it on
 * a different UTC day.
 */
function dayKey(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "unknown";
	}
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${String(year)}-${month}-${day}`;
}

function startOfToday(now: Date): Date {
	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Groups entries into day buckets, newest day first and newest entry first
 * within each day.
 *
 * Ordering is done on the parsed timestamp rather than the string, because the
 * audit timestamps and the attachment timestamps are produced by different code
 * paths and are not guaranteed to share a format.
 */
export function groupTimelineByDay(
	entries: readonly TimelineEntry[],
	now: Date = new Date(),
): TimelineGroup[] {
	const buckets = new Map<string, TimelineEntry[]>();

	for (const entry of entries) {
		const key = dayKey(entry.at);
		const bucket = buckets.get(key);
		if (bucket === undefined) {
			buckets.set(key, [entry]);
		} else {
			bucket.push(entry);
		}
	}

	const today = startOfToday(now);
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const groups: TimelineGroup[] = [];
	for (const [key, bucket] of buckets) {
		const sample = new Date(bucket[0]?.at ?? "");
		let label = Number.isNaN(sample.getTime())
			? "Unknown date"
			: sample.toLocaleDateString("en-GB", {
					day: "numeric",
					month: "short",
					year: "numeric",
				});

		if (Number.isNaN(sample.getTime()) === false) {
			const day = startOfToday(sample);
			if (day.getTime() === today.getTime()) {
				label = "Today";
			} else if (day.getTime() === yesterday.getTime()) {
				label = "Yesterday";
			}
		}

		groups.push({
			key,
			label,
			entries: [...bucket].sort((first, second) => {
				const delta = toTime(second.at) - toTime(first.at);
				// Ties are broken by key so the order is stable across renders
				// rather than depending on the sort implementation.
				return delta === 0 ? first.key.localeCompare(second.key) : delta;
			}),
		});
	}

	return groups.sort((first, second) => {
		const left = new Date(first.entries[0]?.at ?? "").getTime();
		const right = new Date(second.entries[0]?.at ?? "").getTime();
		if (Number.isNaN(left) || Number.isNaN(right)) {
			return 0;
		}
		return right - left;
	});
}

/** Audit rows as timeline entries. */
export function auditEntriesToTimeline(
	auditLogs: readonly TaskAuditLog[],
): TimelineEntry[] {
	return auditLogs.map((row) => ({
		key: `audit-${row.id}`,
		kind: "field-change" as const,
		at: row.createdAt,
		subject: row.changedColumn,
		oldValue: row.oldValue,
		newValue: row.newValue,
	}));
}

/**
 * Attachments as timeline entries.
 *
 * Only the creation of an attachment is represented. A removal is a soft delete
 * that leaves no timestamp the client is authorised to read, so claiming one
 * happened would be inventing history.
 */
export function attachmentsToTimeline(
	attachments: readonly Attachment[],
): TimelineEntry[] {
	return attachments.map((attachment) => ({
		key: `attachment-${attachment.id}`,
		kind: "attachment-added" as const,
		at: attachment.createdAt,
		subject: attachment.fileName,
		oldValue: null,
		newValue: null,
	}));
}

/**
 * Merges both sources into one newest-first list.
 *
 * A field change and an upload that land in the same millisecond are ordered by
 * key, so the sequence does not shuffle between renders.
 */
export function mergeTimeline(
	auditLogs: readonly TaskAuditLog[],
	attachments: readonly Attachment[],
): TimelineEntry[] {
	return [
		...auditEntriesToTimeline(auditLogs),
		...attachmentsToTimeline(attachments),
	].sort((first, second) => {
		const delta = toTime(second.at) - toTime(first.at);
		return delta === 0 ? first.key.localeCompare(second.key) : delta;
	});
}
