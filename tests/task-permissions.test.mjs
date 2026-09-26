import { describe, expect, test } from "bun:test";

import {
	canChangeAssignment,
	canChangeClientVisibility,
	canChangeStatusTo,
	canCreateTask,
	canDeleteTask,
	canEditTask,
	canEditTaskDescription,
	canEditTaskMetadata,
	canManageDependencies,
	getEditableTaskFields,
	getStatusTransitions,
} from "../features/tasks/permissions.ts";

const PM = { role: "PM", id: "pm-1" };
const ENGINEER = { role: "INTERNAL", id: "eng-1" };
const CLIENT = { role: "CLIENT", id: "cl-1" };
const ANONYMOUS = { role: undefined, id: undefined };

function task(overrides = {}) {
	return {
		id: "task-1",
		status: "TODO",
		assignedToId: null,
		isBlocked: false,
		...overrides,
	};
}

describe("task permissions", () => {
	test("only a PM creates, deletes, assigns, and manages dependencies", () => {
		for (const check of [
			canCreateTask,
			canDeleteTask,
			canChangeAssignment,
			canManageDependencies,
		]) {
			expect(check(PM)).toBe(true);
			expect(check(ENGINEER)).toBe(false);
			expect(check(CLIENT)).toBe(false);
			expect(check(ANONYMOUS)).toBe(false);
		}
	});

	test("the description, priority, department, and visibility are PM-only", () => {
		for (const check of [
			canEditTaskDescription,
			canEditTaskMetadata,
			canChangeClientVisibility,
		]) {
			expect(check(PM)).toBe(true);
			expect(check(ENGINEER)).toBe(false);
			expect(check(CLIENT)).toBe(false);
		}
	});

	test("a PM edits any task but an internal user only their own", () => {
		expect(canEditTask(PM, task({ assignedToId: ENGINEER.id }))).toBe(true);
		expect(canEditTask(PM, task())).toBe(true);
		expect(canEditTask(ENGINEER, task({ assignedToId: ENGINEER.id }))).toBe(
			true,
		);
		expect(canEditTask(ENGINEER, task({ assignedToId: "someone-else" }))).toBe(
			false,
		);
		expect(canEditTask(ENGINEER, task())).toBe(false);
	});

	test("a client guest never edits a task", () => {
		expect(canEditTask(CLIENT, task({ assignedToId: CLIENT.id }))).toBe(false);
		expect(canEditTask(ANONYMOUS, task({ assignedToId: ENGINEER.id }))).toBe(
			false,
		);
	});
});

describe("status changes", () => {
	test("an internal user cannot move a task that is not theirs", () => {
		expect(
			canChangeStatusTo(
				ENGINEER,
				task({ assignedToId: "someone-else" }),
				"DONE",
			),
		).toBe(false);
		expect(
			canChangeStatusTo(ENGINEER, task({ assignedToId: ENGINEER.id }), "DONE"),
		).toBe(true);
	});

	test("a client guest never changes a status", () => {
		for (const target of ["TODO", "IN_PROGRESS", "DONE", "BLOCKED"]) {
			expect(
				canChangeStatusTo(CLIENT, task({ assignedToId: CLIENT.id }), target),
			).toBe(false);
		}
	});

	// The assessment rule that is easy to get wrong: completing in-progress work
	// belongs to the person doing it, so a PM driving someone else's task may
	// start it but may not mark it done. The UI has to keep that control away.
	test("only the assignee may complete an in-progress task, including for a PM", () => {
		const inProgress = task({
			status: "IN_PROGRESS",
			assignedToId: ENGINEER.id,
		});
		expect(canChangeStatusTo(ENGINEER, inProgress, "DONE")).toBe(true);
		expect(canChangeStatusTo(PM, inProgress, "DONE")).toBe(false);
		expect(canChangeStatusTo(PM, task({ status: "IN_PROGRESS" }), "DONE")).toBe(
			false,
		);
	});

	test("a PM may still start and reassign a task assigned to someone else", () => {
		const inProgress = task({
			status: "IN_PROGRESS",
			assignedToId: ENGINEER.id,
		});
		expect(canChangeStatusTo(PM, inProgress, "IN_PROGRESS")).toBe(true);
		expect(canChangeStatusTo(PM, inProgress, "BLOCKED")).toBe(true);
		expect(canChangeStatusTo(PM, inProgress, "TODO")).toBe(true);
	});
});

describe("getStatusTransitions", () => {
	test("never offers the status the task already has", () => {
		const transitions = getStatusTransitions(PM, task({ status: "DONE" }));
		expect(transitions.map((item) => item.targetStatus)).not.toContain("DONE");
		expect(transitions).toHaveLength(3);
	});

	test("a PM is not offered a completion for someone else's in-progress task", () => {
		const transitions = getStatusTransitions(
			PM,
			task({ status: "IN_PROGRESS", assignedToId: ENGINEER.id }),
		);
		const done = transitions.find((item) => item.targetStatus === "DONE");

		expect(done).toBeDefined();
		expect(done?.blockedReason).toBe(
			"Only the assignee can mark this task done.",
		);
	});

	test("a client guest gets every transition closed with a reason", () => {
		const transitions = getStatusTransitions(CLIENT, task());
		expect(transitions).toHaveLength(3);
		expect(transitions.every((item) => item.blockedReason !== null)).toBe(true);
	});

	// A start is blocked by the server-calculated isBlocked, never a client guess,
	// so the reason shown is the reason the API would give.
	test("a blocked task cannot be started and says why", () => {
		const transitions = getStatusTransitions(
			ENGINEER,
			task({ assignedToId: ENGINEER.id, isBlocked: true }),
		);
		const start = transitions.find(
			(item) => item.targetStatus === "IN_PROGRESS",
		);

		expect(start?.blockedReason).toBe(
			"Complete the prerequisites before starting this task.",
		);
	});
});

describe("getEditableTaskFields", () => {
	test("a PM editing a task assigned to someone else can change everything", () => {
		const fields = getEditableTaskFields(
			PM,
			task({ assignedToId: ENGINEER.id }),
		);
		expect([...fields].sort()).toEqual(
			[
				"assignedToId",
				"clientVisible",
				"department",
				"description",
				"priority",
				"status",
				"title",
			].sort(),
		);
	});

	// This is the spec's Internal Team rule: the description and the ownership
	// fields stay PM-owned, so the form must not offer them.
	test("an internal user gets the title and status only", () => {
		const fields = getEditableTaskFields(
			ENGINEER,
			task({ assignedToId: ENGINEER.id }),
		);
		expect([...fields].sort()).toEqual(["status", "title"]);
		expect(fields.has("description")).toBe(false);
		expect(fields.has("priority")).toBe(false);
		expect(fields.has("assignedToId")).toBe(false);
		expect(fields.has("clientVisible")).toBe(false);
	});

	test("a client guest gets nothing", () => {
		const fields = getEditableTaskFields(
			CLIENT,
			task({ assignedToId: CLIENT.id }),
		);
		expect(fields.size).toBe(0);
	});
});
