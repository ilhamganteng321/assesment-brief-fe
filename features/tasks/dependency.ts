import type { Task, TaskDependency } from "./types";

/**
 * The board columns. `BLOCKED` is a *view* column, not a status the client may
 * assign: a task lands there because the server calculated `isBlocked`, so the
 * board can never disagree with the API.
 */
export const TASK_BOARD_COLUMNS = [
	"TODO",
	"BLOCKED",
	"IN_PROGRESS",
	"DONE",
] as const;
export type TaskBoardColumn = (typeof TASK_BOARD_COLUMNS)[number];

/** Only the fields the board needs, so the logic stays trivially testable. */
type BoardTask = Pick<Task, "id" | "status" | "isBlocked">;

export function getTaskBoardColumn(task: BoardTask): TaskBoardColumn {
	if (task.status === "DONE") {
		return "DONE";
	}

	if (task.status === "IN_PROGRESS") {
		return "IN_PROGRESS";
	}

	// A finished task cannot be "waiting", and an in progress task is already
	// running, so a calculated block only ever moves queued work aside.
	return task.isBlocked ? "BLOCKED" : "TODO";
}

export function emptyTaskBoard(): Record<TaskBoardColumn, Task[]> {
	return { TODO: [], BLOCKED: [], IN_PROGRESS: [], DONE: [] };
}

export function groupTasksIntoBoard(
	tasks: readonly Task[],
): Record<TaskBoardColumn, Task[]> {
	const board = emptyTaskBoard();

	for (const task of tasks) {
		board[getTaskBoardColumn(task)].push(task);
	}

	return board;
}

/**
 * The prerequisites a PM can still add. The candidate list is narrowed to the
 * task's own project, the task itself, and the prerequisites already wired up;
 * cycle and duplicate rejection stay a server decision, but the obvious cases
 * never reach the network.
 */
export function getDependencyCandidates(
	tasks: readonly Task[],
	input: {
		taskId: string;
		projectId: string;
		existingDependencies?: readonly TaskDependency[];
		includeDone?: boolean;
	},
): Task[] {
	const existing = new Set(
		(input.existingDependencies ?? []).map((dependency) => dependency.id),
	);
	const includeDone = input.includeDone ?? false;

	return tasks.filter((task) => {
		if (task.id === input.taskId) {
			return false;
		}

		if (task.projectId !== input.projectId) {
			return false;
		}

		if (existing.has(task.id)) {
			return false;
		}

		return includeDone || task.status !== "DONE";
	});
}

export function canStartTask(task: BoardTask): boolean {
	return (
		task.status !== "IN_PROGRESS" && task.status !== "DONE" && !task.isBlocked
	);
}

/**
 * Why the Start control is unavailable, or `null` when it is available. The
 * message is derived from server state only, so it can never promise a start
 * the API would reject.
 */
export function getStartBlockedReason(task: BoardTask): string | null {
	if (task.isBlocked) {
		return "Complete the prerequisites before starting this task.";
	}

	if (task.status === "IN_PROGRESS") {
		return "This task is already in progress.";
	}

	if (task.status === "DONE") {
		return "This task is already done.";
	}

	return null;
}

/** Prerequisites that are unfinished, which is what the UI has to explain. */
export function getUnfinishedDependencies(
	dependencies: readonly TaskDependency[],
): TaskDependency[] {
	return dependencies.filter(
		(dependency) => dependency.status !== "DONE" && !dependency.deleted,
	);
}
