import type { ProjectStatus } from "./types";

/**
 * The project lifecycle, mirrored from the server.
 *
 *     PLANNING -> ACTIVE -> COMPLETED -> ARCHIVED
 *
 * This is **advisory**. The backend owns the rule and re-checks it on every
 * request; a stale client that forges a request is still refused with 409
 * INVALID_PROJECT_STATUS_TRANSITION. The map exists so the interface does not
 * offer a move the API will reject — no "Archive" on a project that is not
 * finished, and no "Reopen" anywhere, because reopening is not a thing the
 * product does.
 *
 * It is kept as a literal table rather than a switch so that adding a status to
 * the enum without deciding where it sits fails the type check instead of
 * silently defaulting to "anything goes".
 */
export const PROJECT_STATUS_TRANSITIONS: Readonly<
	Record<ProjectStatus, readonly ProjectStatus[]>
> = {
	PLANNING: ["ACTIVE"],
	ACTIVE: ["COMPLETED"],
	COMPLETED: ["ARCHIVED"],
	// Terminal. There is no reopen: a completed project stays read-only.
	ARCHIVED: [],
};

/** The statuses a project may move to from `current`. Empty once it is archived. */
export function getNextProjectStatuses(
	current: ProjectStatus,
): readonly ProjectStatus[] {
	return PROJECT_STATUS_TRANSITIONS[current];
}

/** Whether a direct move from `current` to `next` is part of the lifecycle. */
export function canTransitionProjectStatus(
	current: ProjectStatus,
	next: ProjectStatus,
): boolean {
	return PROJECT_STATUS_TRANSITIONS[current].includes(next);
}

/** True when the project has reached the end of its lifecycle. */
export function isArchivedProject(status: ProjectStatus): boolean {
	return status === "ARCHIVED";
}

/**
 * An archived project is read-only, and one that is merely completed is not.
 *
 * Archived is the only state the server refuses further edits in, so this is the
 * only state the interface should stop offering them in too.
 */
export function isProjectReadOnly(status: ProjectStatus): boolean {
	return isArchivedProject(status);
}

/**
 * How many tasks are done, phrased for a confirmation.
 *
 * The progress figure is shown when it is known so a project manager can see
 * what they are about to close. It is never a gate: completing a project is a
 * decision about the project rather than its tasks, the server does not require
 * every task to be DONE, and no task status is changed by the move. A `null` for
 * either figure means the metrics have not loaded, in which case the prompt
 * simply omits the line rather than guessing.
 */
export function getTaskProgressSummary(input: {
	completed: number | null;
	total: number | null;
}): string | null {
	if (input.total === null || input.completed === null) {
		return null;
	}

	return `${String(input.completed)} of ${String(input.total)} ${
		input.total === 1 ? "task" : "tasks"
	} completed`;
}
