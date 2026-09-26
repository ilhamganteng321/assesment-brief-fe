import { describe, expect, test } from "bun:test";

import {
	canStartTask,
	getDependencyCandidates,
	getStartBlockedReason,
	getTaskBoardColumn,
	getUnfinishedDependencies,
	groupTasksIntoBoard,
	TASK_BOARD_COLUMNS,
} from "../features/tasks/dependency.ts";
import {
	DEFAULT_TASK_LIST_STATE,
	parseTaskListState,
	serializeTaskListState,
	toTaskListQueryParams,
} from "../features/tasks/list-state.ts";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const OTHER_PROJECT = "22222222-2222-4222-8222-222222222222";

let sequence = 0;

function task(overrides = {}) {
	sequence += 1;

	return {
		id: `task-${sequence}`,
		projectId: PROJECT,
		assignedToId: null,
		title: `Task ${sequence}`,
		description: null,
		status: "TODO",
		priority: "MEDIUM",
		department: "BACKEND",
		clientVisible: false,
		version: 1,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		isBlocked: false,
		blockedBy: [],
		...overrides,
	};
}

function dependency(overrides = {}) {
	sequence += 1;

	return {
		id: `dep-${sequence}`,
		title: `Dependency ${sequence}`,
		status: "TODO",
		deleted: false,
		...overrides,
	};
}

describe("getTaskBoardColumn", () => {
	test("queues an unfinished unblocked task", () => {
		expect(getTaskBoardColumn(task())).toBe("TODO");
	});

	test("moves a queued task into the blocked column when the server says so", () => {
		expect(getTaskBoardColumn(task({ isBlocked: true }))).toBe("BLOCKED");
	});

	test("keeps an in progress task in progress even while blocked", () => {
		expect(
			getTaskBoardColumn(task({ status: "IN_PROGRESS", isBlocked: true })),
		).toBe("IN_PROGRESS");
	});

	test("keeps a done task done", () => {
		expect(getTaskBoardColumn(task({ status: "DONE", isBlocked: true }))).toBe(
			"DONE",
		);
	});

	test("treats a persisted BLOCKED status as queued work", () => {
		expect(getTaskBoardColumn(task({ status: "BLOCKED" }))).toBe("TODO");
	});
});

describe("groupTasksIntoBoard", () => {
	test("produces every column and places each task exactly once", () => {
		const tasks = [
			task({ id: "a" }),
			task({ id: "b", isBlocked: true }),
			task({ id: "c", status: "IN_PROGRESS" }),
			task({ id: "d", status: "DONE" }),
		];
		const board = groupTasksIntoBoard(tasks);

		expect(Object.keys(board).sort()).toEqual([...TASK_BOARD_COLUMNS].sort());
		expect(board.TODO.map((row) => row.id)).toEqual(["a"]);
		expect(board.BLOCKED.map((row) => row.id)).toEqual(["b"]);
		expect(board.IN_PROGRESS.map((row) => row.id)).toEqual(["c"]);
		expect(board.DONE.map((row) => row.id)).toEqual(["d"]);
	});

	test("returns empty columns for an empty list", () => {
		const board = groupTasksIntoBoard([]);

		expect(
			TASK_BOARD_COLUMNS.every((column) => board[column].length === 0),
		).toBe(true);
	});
});

describe("canStartTask", () => {
	test("allows a queued task with no blocking prerequisite", () => {
		expect(canStartTask(task())).toBe(true);
	});

	test("refuses a task the server reports as blocked", () => {
		expect(canStartTask(task({ isBlocked: true }))).toBe(false);
	});

	test("refuses a task that already started or finished", () => {
		expect(canStartTask(task({ status: "IN_PROGRESS" }))).toBe(false);
		expect(canStartTask(task({ status: "DONE" }))).toBe(false);
	});
});

describe("getStartBlockedReason", () => {
	test("returns null when the task can start", () => {
		expect(getStartBlockedReason(task())).toBeNull();
	});

	test("explains the calculated block", () => {
		expect(getStartBlockedReason(task({ isBlocked: true }))).toContain(
			"prerequisites",
		);
	});

	test("explains an already running task", () => {
		expect(getStartBlockedReason(task({ status: "IN_PROGRESS" }))).toContain(
			"already in progress",
		);
	});

	test("explains a finished task", () => {
		expect(getStartBlockedReason(task({ status: "DONE" }))).toContain(
			"already done",
		);
	});
});

describe("getDependencyCandidates", () => {
	const current = task({ id: "current" });

	test("never offers the task itself", () => {
		const other = task({ id: "other" });

		expect(
			getDependencyCandidates([current, other], {
				taskId: current.id,
				projectId: PROJECT,
			}),
		).toEqual([other]);
	});

	test("only offers tasks from the same project", () => {
		const sameProject = task({ id: "same" });
		const otherProject = task({ id: "other", projectId: OTHER_PROJECT });

		expect(
			getDependencyCandidates([sameProject, otherProject], {
				taskId: current.id,
				projectId: PROJECT,
			}).map((row) => row.id),
		).toEqual(["same"]);
	});

	test("hides prerequisites that are already wired up", () => {
		const already = task({ id: "already" });
		const fresh = task({ id: "fresh" });

		expect(
			getDependencyCandidates([already, fresh], {
				taskId: current.id,
				projectId: PROJECT,
				existingDependencies: [dependency({ id: already.id })],
			}).map((row) => row.id),
		).toEqual(["fresh"]);
	});

	test("hides completed tasks unless they are asked for", () => {
		const done = task({ id: "done", status: "DONE" });
		const input = { taskId: current.id, projectId: PROJECT };

		expect(getDependencyCandidates([done], input)).toEqual([]);
		expect(
			getDependencyCandidates([done], { ...input, includeDone: true }),
		).toEqual([done]);
	});
});

describe("getUnfinishedDependencies", () => {
	test("keeps only outstanding, live prerequisites", () => {
		const dependencies = [
			dependency({ id: "todo", status: "TODO" }),
			dependency({ id: "done", status: "DONE" }),
			dependency({ id: "gone", status: "TODO", deleted: true }),
		];

		expect(
			getUnfinishedDependencies(dependencies).map((row) => row.id),
		).toEqual(["todo"]);
	});
});

describe("task list view state", () => {
	test("defaults to the list view", () => {
		expect(parseTaskListState(new URLSearchParams("")).view).toBe("list");
		expect(DEFAULT_TASK_LIST_STATE.view).toBe("list");
	});

	test("round-trips the board view through the URL", () => {
		const params = serializeTaskListState({
			...DEFAULT_TASK_LIST_STATE,
			view: "board",
		});

		expect(params.get("view")).toBe("board");
		expect(parseTaskListState(params).view).toBe("board");
	});

	test("keeps the view out of the URL while it is the default", () => {
		expect(
			serializeTaskListState({ ...DEFAULT_TASK_LIST_STATE, view: "list" }).get(
				"view",
			),
		).toBeNull();
	});

	test("ignores an unknown view", () => {
		expect(parseTaskListState(new URLSearchParams("view=kanban")).view).toBe(
			"list",
		);
	});

	test("never sends the view to the server", () => {
		const query = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			projectId: PROJECT,
			view: "board",
		});

		expect(Object.keys(query)).not.toContain("view");
		expect(Object.keys(query.filters)).toEqual(["projectId"]);
	});
});
