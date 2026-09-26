import { describe, expect, test } from "bun:test";

import {
	attachmentsToTimeline,
	auditEntriesToTimeline,
	groupTimelineByDay,
	mergeTimeline,
} from "../features/tasks/timeline.ts";

function audit(overrides = {}) {
	return {
		id: "a1",
		taskId: "t1",
		userId: "u1",
		changedColumn: "status",
		oldValue: "TODO",
		newValue: "IN_PROGRESS",
		createdAt: "2026-03-02T10:42:00.000Z",
		...overrides,
	};
}

function attachment(overrides = {}) {
	return {
		id: "f1",
		taskId: "t1",
		fileName: "design.png",
		mimeType: "image/png",
		fileSize: 1024,
		createdAt: "2026-03-02T09:58:00.000Z",
		uploadedBy: { id: "u1", name: "Ada" },
		...overrides,
	};
}

describe("timeline sources", () => {
	test("an audit row becomes a field change", () => {
		const [entry] = auditEntriesToTimeline([audit()]);

		expect(entry.kind).toBe("field-change");
		expect(entry.subject).toBe("status");
		expect(entry.oldValue).toBe("TODO");
		expect(entry.newValue).toBe("IN_PROGRESS");
	});

	test("an attachment becomes an added event", () => {
		const [entry] = attachmentsToTimeline([attachment()]);

		expect(entry.kind).toBe("attachment-added");
		expect(entry.subject).toBe("design.png");
	});

	// A removal is a soft delete with no timestamp the client may read, so
	// claiming one happened would be inventing history.
	test("only the creation of an attachment is represented", () => {
		const entries = attachmentsToTimeline([attachment()]);

		expect(entries).toHaveLength(1);
		expect(entries.some((entry) => entry.kind === "attachment-removed")).toBe(
			false,
		);
	});

	test("keys are unique across both sources", () => {
		const merged = mergeTimeline(
			[audit({ id: "x" })],
			[attachment({ id: "x" })],
		);

		expect(new Set(merged.map((entry) => entry.key)).size).toBe(2);
	});
});

describe("mergeTimeline", () => {
	test("orders both sources newest first", () => {
		const merged = mergeTimeline(
			[
				audit({ id: "old", createdAt: "2026-03-02T09:00:00.000Z" }),
				audit({ id: "new", createdAt: "2026-03-02T11:00:00.000Z" }),
			],
			[attachment({ createdAt: "2026-03-02T10:00:00.000Z" })],
		);

		expect(merged.map((entry) => entry.subject)).toEqual([
			"status",
			"design.png",
			"status",
		]);
		expect(merged.map((entry) => entry.kind)).toEqual([
			"field-change",
			"attachment-added",
			"field-change",
		]);
	});

	// Ordering has to be stable, or entries would shuffle between renders when
	// two events land in the same millisecond.
	test("breaks ties deterministically", () => {
		const at = "2026-03-02T10:00:00.000Z";
		const first = mergeTimeline(
			[audit({ id: "b", createdAt: at })],
			[attachment({ id: "a", createdAt: at })],
		);
		const second = mergeTimeline(
			[audit({ id: "b", createdAt: at })],
			[attachment({ id: "a", createdAt: at })],
		);

		expect(first.map((entry) => entry.key)).toEqual(
			second.map((entry) => entry.key),
		);
	});

	test("sorts on the parsed timestamp, not the string", () => {
		// Lexicographically "2026-03-02T9:00" sorts after "2026-03-02T10:00";
		// parsed, it is correctly earlier.
		const merged = mergeTimeline(
			[
				audit({ id: "b", createdAt: "2026-03-02T10:00:00.000Z" }),
				audit({ id: "a", createdAt: "2026-03-02T09:00:00.000+00:00" }),
			],
			[],
		);

		expect(merged.map((entry) => entry.key)).toEqual(["audit-b", "audit-a"]);
	});
});

describe("groupTimelineByDay", () => {
	const now = new Date("2026-03-02T12:00:00.000Z");

	test("labels today and yesterday relative to the caller", () => {
		const today = new Date("2026-03-02T08:00:00.000Z");
		const yesterday = new Date("2026-03-01T22:00:00.000Z");
		const groups = groupTimelineByDay(
			mergeTimeline(
				[
					audit({ id: "t", createdAt: today.toISOString() }),
					audit({ id: "y", createdAt: yesterday.toISOString() }),
				],
				[],
			),
			now,
		);

		expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday"]);
	});

	test("uses a formatted date for anything older", () => {
		const older = new Date("2026-01-05T08:00:00.000Z");
		const groups = groupTimelineByDay(
			mergeTimeline([audit({ id: "o", createdAt: older.toISOString() })], []),
			now,
		);

		expect(groups[0].label).toBe("5 Jan 2026");
	});

	test("orders groups newest day first", () => {
		const groups = groupTimelineByDay(
			mergeTimeline(
				[
					audit({ id: "old", createdAt: "2026-01-05T08:00:00.000Z" }),
					audit({ id: "new", createdAt: "2026-03-02T08:00:00.000Z" }),
				],
				[],
			),
			now,
		);

		expect(groups[0].entries[0].key).toBe("audit-new");
	});

	test("orders entries newest first inside a day", () => {
		const groups = groupTimelineByDay(
			mergeTimeline(
				[
					audit({ id: "a", createdAt: "2026-03-02T08:00:00.000Z" }),
					audit({ id: "b", createdAt: "2026-03-02T11:00:00.000Z" }),
				],
				[],
			),
			now,
		);

		expect(groups).toHaveLength(1);
		expect(groups[0].entries.map((entry) => entry.key)).toEqual([
			"audit-b",
			"audit-a",
		]);
	});

	test("an unparseable timestamp lands in its own bucket rather than throwing", () => {
		const groups = groupTimelineByDay(
			mergeTimeline([audit({ id: "bad", createdAt: "not-a-date" })], []),
			now,
		);

		expect(groups).toHaveLength(1);
		expect(groups[0].label).toBe("Unknown date");
	});

	test("an empty timeline produces no groups", () => {
		expect(groupTimelineByDay([], now)).toEqual([]);
	});
});
