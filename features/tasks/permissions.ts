import type { UserRole } from "@/features/auth/types";

import type { TaskFormField } from "./schemas";
import { TASK_STATUSES, type Task, type TaskStatus } from "./types";

/**
 * UI-side mirror of the backend task policy.
 *
 * Every function here is **advisory**. It exists so the interface does not offer
 * an action the API is going to refuse, which is a usability concern rather than
 * a security one: the backend re-checks authorization, dependency rules, state
 * transitions, and the optimistic-lock version on every single request. Hiding a
 * button is never the thing that enforces a rule, and a stale client that calls
 * the API anyway is still rejected.
 *
 * Each function mirrors one named rule on the server so the two can be compared
 * directly:
 *   - `canEditTask` / `canEditTaskDescription` / `canChangeClientVisibility`
 *   - `canChangeTaskStatus` / `canCompleteTask` in the authorization service
 *   - `canAssignTask`, `canDeleteTask`, `canCreateTask`, `canManageDependencies`
 */

/** Only the task fields these decisions depend on, so the logic stays testable. */
export type TaskPermissionSubject = Pick<
	Task,
	"id" | "status" | "assignedToId"
>;

/** The authenticated user, or `undefined` while the session is still resolving. */
type Viewer = { role: UserRole | undefined; id?: string };

function isProjectManager(user: Viewer): boolean {
	return user.role === "PM";
}

function isInternal(user: Viewer): boolean {
	return user.role === "INTERNAL";
}

/** Mirrors the absence of `TASK_CREATE` / `TASK_DELETE` for anyone but a PM. */
export function canCreateTask(user: Viewer): boolean {
	return isProjectManager(user);
}

export function canDeleteTask(user: Viewer): boolean {
	return isProjectManager(user);
}

/** Mirrors `canAssignTask` and `canManageDependencies`: PM only. */
export function canChangeAssignment(user: Viewer): boolean {
	return isProjectManager(user);
}

export function canManageDependencies(user: Viewer): boolean {
	return isProjectManager(user);
}

/** Mirrors `canEditTaskMetadata`: priority and department stay PM-owned. */
export function canEditTaskMetadata(user: Viewer): boolean {
	return isProjectManager(user);
}

/** Mirrors `canEditTaskDescription`: the description is PM-owned. */
export function canEditTaskDescription(user: Viewer): boolean {
	return isProjectManager(user);
}

export function canChangeClientVisibility(user: Viewer): boolean {
	return isProjectManager(user);
}

/**
 * Mirrors `canEditTask`: a PM may edit anything, an internal user only a task
 * assigned to them, and a client guest never.
 */
export function canEditTask(
	user: Viewer,
	task: TaskPermissionSubject,
): boolean {
	if (user.role === undefined || user.role === "CLIENT") {
		return false;
	}
	if (isProjectManager(user)) {
		return true;
	}
	return task.assignedToId !== null && task.assignedToId === user.id;
}

/** The only user allowed to close a task is the person doing the work. */
function canCompleteTask(user: Viewer, task: TaskPermissionSubject): boolean {
	return (
		user.id !== undefined &&
		task.assignedToId !== null &&
		task.assignedToId === user.id
	);
}

/**
 * Mirrors `canChangeTaskStatus`.
 *
 * The rule that surprises people: completing an in-progress task belongs to the
 * assignee, so a PM managing someone else's task may start it and reassign it but
 * may not mark it done. The UI therefore has to keep a "Mark done" control away
 * from a PM in that situation, while the API stays the thing that actually
 * refuses the request.
 */
export function canChangeStatusTo(
	user: Viewer & { id?: string },
	task: TaskPermissionSubject,
	targetStatus: TaskStatus,
): boolean {
	if (user.role !== "PM" && user.role !== "INTERNAL") {
		return false;
	}

	if (targetStatus === "DONE" && task.status === "IN_PROGRESS") {
		return canCompleteTask(user, task);
	}

	if (isInternal(user)) {
		return task.assignedToId !== null && task.assignedToId === user.id;
	}

	return true;
}

/**
 * The fields this viewer may change on a given task.
 *
 * Used by the edit form to render the non-editable ones as read-only instead of
 * offering an input the API would reject. The backend re-checks all of them, so
 * this is a usability measure: a PM editing their own task gets everything, an
 * internal user assigned to it gets the title and the status and nothing else,
 * and a client guest gets nothing.
 */
export function getEditableTaskFields(
	user: Viewer,
	task: TaskPermissionSubject,
): Set<TaskFormField> {
	const fields = new Set<TaskFormField>();

	if (canEditTask(user, task)) {
		fields.add("title");
	}
	if (canEditTaskDescription(user)) {
		fields.add("description");
	}
	if (canChangeStatusTo(user, task, "IN_PROGRESS")) {
		fields.add("status");
	}
	if (canEditTaskMetadata(user)) {
		fields.add("priority");
		fields.add("department");
	}
	if (canChangeAssignment(user)) {
		fields.add("assignedToId");
	}
	if (canChangeClientVisibility(user)) {
		fields.add("clientVisible");
	}

	return fields;
}

export type StatusTransition = {
	targetStatus: TaskStatus;
	/** Why this transition is unavailable, or `null` when it is offered. */
	blockedReason: string | null;
};

/**
 * The transitions to offer for a task, each with the reason it is unavailable
 * when it is not.
 *
 * A transition into `IN_PROGRESS` is blocked by the server-calculated
 * `isBlocked`, never by a client-side guess, so the explanation shown here is
 * always the reason the API would give.
 */
export function getStatusTransitions(
	user: Viewer & { id?: string },
	task: TaskPermissionSubject & { isBlocked: boolean },
): StatusTransition[] {
	return TASK_STATUSES.filter(
		(targetStatus) => targetStatus !== task.status,
	).map((targetStatus) => {
		if (!canChangeStatusTo(user, task, targetStatus)) {
			return {
				targetStatus,
				blockedReason: getPermissionReason(user, task, targetStatus),
			};
		}
		if (targetStatus === "IN_PROGRESS" && task.isBlocked) {
			return {
				targetStatus,
				blockedReason: "Complete the prerequisites before starting this task.",
			};
		}
		return { targetStatus, blockedReason: null };
	});
}

/** Why a transition is closed to this user, in wording the UI can show. */
function getPermissionReason(
	user: Viewer & { id?: string },
	task: TaskPermissionSubject,
	targetStatus: TaskStatus,
): string {
	if (user.role === "CLIENT") {
		return "Clients cannot change task status.";
	}
	if (user.role === undefined) {
		return "Sign in to change task status.";
	}
	if (targetStatus === "DONE" && task.status === "IN_PROGRESS") {
		return "Only the assignee can mark this task done.";
	}
	if (isInternal(user) && task.assignedToId !== user.id) {
		return "You can only change the status of tasks assigned to you.";
	}
	return "You do not have permission to set this status.";
}
