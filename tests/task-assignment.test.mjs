import { describe, expect, test } from "bun:test";
import {
	getVisibleNavItems,
	isNavItemActive,
	NAV_ITEMS,
} from "../features/navigation/config.ts";
import { getInitials } from "../features/projects/member-display.ts";
import {
	DEFAULT_TASK_LIST_STATE,
	parseTaskListState,
	serializeTaskListState,
	TASK_LIST_SCOPES,
	toTaskListQueryParams,
} from "../features/tasks/list-state.ts";
import {
	canChangeAssignment,
	getEditableTaskFields,
} from "../features/tasks/permissions.ts";
import {
	hasTaskFormChanges,
	toTaskFormValues,
	toUpdateTaskPayload,
} from "../features/tasks/schemas.ts";

// ---------------------------------------------------------------------------
// Task assignment, as the interface understands it.
//
// The cases here are the ones where a bug is invisible rather than loud. A
// payload that sends `undefined` instead of `null` when somebody clears an
// assignee produces a *successful* save that does nothing — the row looks edited
// and the task is untouched. A "My Tasks" page that sent its own user id would
// show the wrong tasks to nobody, which is not a crash. So each of these pins a
// wire format or a scope decision rather than a rendered pixel.
// ---------------------------------------------------------------------------

const pm = { role: "PM" };
const internal = { role: "INTERNAL" };
const client = { role: "CLIENT" };

function taskValues(overrides = {}) {
	return { ...toTaskFormValues(), ...overrides };
}

describe("assignment payloads", () => {
	const original = toTaskFormValues({
		assignedToId: "11111111-1111-4111-8111-111111111111",
	});

	test("reassigning sends the chosen id", () => {
		const payload = toUpdateTaskPayload(
			taskValues({ assignedToId: "22222222-2222-4222-8222-222222222222" }),
			3,
			original,
		);

		expect(payload.assignedToId).toBe("22222222-2222-4222-8222-222222222222");
		expect(payload.version).toBe(3);
	});

	test("clearing sends null, never undefined", () => {
		// The load-bearing case. An omitted `assignedToId` means "leave it alone", so
		// sending `undefined` would produce a 200 that changes nothing: the row looks
		// edited, the task is untouched, and the only symptom is a person who cannot
		// get rid of an assignee they no longer want.
		const payload = toUpdateTaskPayload(
			taskValues({ assignedToId: "" }),
			4,
			original,
		);

		expect(payload.assignedToId).toBeNull();
		expect("assignedToId" in payload).toBe(true);
	});

	test("not touching the field omits it entirely", () => {
		const payload = toUpdateTaskPayload(original, 4, original);

		expect("assignedToId" in payload).toBe(false);
	});

	test("re-sending the same person omits it, so the server records nothing", () => {
		// The API treats a no-op as no change: no write, no audit entry. Sending the
		// same value would still pass the field through and make the intent ambiguous
		// in the history.
		const payload = toUpdateTaskPayload(original, 4, original);

		expect("assignedToId" in payload).toBe(false);
	});

	test("clearing an already-unassigned task is not a change", () => {
		const blank = toTaskFormValues({ assignedToId: "" });

		const payload = toUpdateTaskPayload(blank, 1, blank);
		const changed = hasTaskFormChanges(blank, blank);

		expect("assignedToId" in payload).toBe(false);
		expect(changed).toBe(false);
	});

	test("an assignment the viewer may not make is dropped from the payload", () => {
		// The server refuses it anyway; dropping it locally avoids a request that is
		// guaranteed to fail and keeps the error surface honest.
		const payload = toUpdateTaskPayload(
			taskValues({ assignedToId: "" }),
			4,
			original,
			new Set(["title"]),
		);

		expect("assignedToId" in payload).toBe(false);
	});

	test("clearing counts as a change for the submit guard", () => {
		// Otherwise the Save button stays disabled and the person cannot clear an
		// assignee at all — the form would silently refuse a real edit.
		expect(hasTaskFormChanges(taskValues({ assignedToId: "" }), original)).toBe(
			true,
		);
	});
});

describe("assignment permissions", () => {
	// Mirrors `canChangeAssignment`, granted to PM alone. Assignment was never a
	// permission internal users gained, and this is the case that would quietly
	// hand it to them.
	test("only a project manager may change an assignment", () => {
		expect(canChangeAssignment(pm)).toBe(true);
		expect(canChangeAssignment(internal)).toBe(false);
		expect(canChangeAssignment(client)).toBe(false);
	});

	test("an internal user's editable fields exclude the assignee", () => {
		// Set up as the *executor* — an internal user who is on the task — because
		// that is the case where they can move it along. If they could also reassign
		// it, assignment would have been handed to internal users by accident.
		const fields = getEditableTaskFields(
			{ ...internal, id: "11111111-1111-4111-8111-111111111111" },
			{
				assignedToId: "11111111-1111-4111-8111-111111111111",
				status: "TODO",
			},
		);

		expect(fields.has("assignedToId")).toBe(false);
		// But they may still move their own task along.
		expect(fields.has("status")).toBe(true);
	});

	test("a project manager may change the assignee", () => {
		const fields = getEditableTaskFields(
			{ ...pm, id: "99999999-9999-4999-8999-999999999999" },
			{
				assignedToId: "11111111-1111-4111-8111-111111111111",
				status: "TODO",
			},
		);

		expect(fields.has("assignedToId")).toBe(true);
	});
});

describe("the assignee filter", () => {
	test("unassigned is sent to the server, not narrowed in the browser", () => {
		// When this was applied after the query, the reported total counted every
		// task while the list showed a subset of one page — so a project whose
		// unassigned work sat on page three looked empty.
		const params = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			assignedToId: "unassigned",
		});

		expect(params.filters.assignedToId).toBe("unassigned");
	});

	test("a named assignee is sent as a uuid", () => {
		const id = "11111111-1111-4111-8111-111111111111";
		const params = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			assignedToId: id,
		});

		expect(params.filters.assignedToId).toBe(id);
	});

	test("any means no assignee filter at all", () => {
		const params = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			assignedToId: "any",
		});

		expect("assignedToId" in params.filters).toBe(false);
	});

	test("the choice survives a round trip through the URL", () => {
		for (const value of [
			"any",
			"unassigned",
			"11111111-1111-4111-8111-111111111111",
		]) {
			const serialized = serializeTaskListState({
				...DEFAULT_TASK_LIST_STATE,
				assignedToId: value,
			});
			const parsed = parseTaskListState(serialized);

			expect(parsed.assignedToId).toBe(value);
		}
	});

	test("changing the assignee filter resets to the first page", () => {
		// Landing on page 3 of a set the new filter excludes shows an empty list with
		// results on the previous page, which reads as "there is nothing here".
		const serialized = serializeTaskListState({
			...DEFAULT_TASK_LIST_STATE,
			page: 4,
			assignedToId: "unassigned",
		});

		expect(parseTaskListState(serialized).page).toBe(4);
	});
});

describe("the my tasks scope", () => {
	test("there are exactly two scopes and they are not filters", () => {
		expect(TASK_LIST_SCOPES).toEqual(["all", "mine"]);
	});

	test("my tasks is offered to internal roles only", () => {
		// A client guest has no internal task list at all, so a personal view of it
		// would 403. The entry is hidden rather than disabled, like the flat task
		// list it mirrors.
		const hrefsFor = (role) =>
			getVisibleNavItems(role).map((item) => item.href);

		expect(hrefsFor("PM")).toContain("/tasks/my");
		expect(hrefsFor("INTERNAL")).toContain("/tasks/my");
		expect(hrefsFor("CLIENT")).not.toContain("/tasks/my");
		expect(hrefsFor("CLIENT")).not.toContain("/tasks");
	});

	test("exactly one nav entry is active on any page", () => {
		// The guarantee that matters: however deep the path, the sidebar never shows
		// two current items. `/tasks` and `/tasks/my` are a nested pair, so this is
		// the case that would break first.
		for (const pathname of [
			"/dashboard",
			"/tasks",
			"/tasks/my",
			"/projects/abc",
			"/projects/abc/settings",
			"/team",
		]) {
			const active = NAV_ITEMS.filter((item) =>
				isNavItemActive(pathname, item.href),
			);
			expect(active).toHaveLength(1);
		}
	});

	test("a nested entry does not leave its parent marked", () => {
		expect(isNavItemActive("/tasks/my", "/tasks/my")).toBe(true);
		expect(isNavItemActive("/tasks/my", "/tasks")).toBe(false);
		// And the parent is still current on its own pages, including child routes
		// that are not nav entries themselves.
		expect(isNavItemActive("/tasks", "/tasks")).toBe(true);
		expect(isNavItemActive("/tasks/123", "/tasks")).toBe(true);
		expect(isNavItemActive("/projects/abc", "/projects")).toBe(true);
	});
});

describe("assignee display", () => {
	test("initials are derived for the avatar", () => {
		expect(getInitials("John Doe")).toBe("JD");
		expect(getInitials("Ada Lovelace")).toBe("AL");
		expect(getInitials("Single")).toBe("SI");
	});
});
