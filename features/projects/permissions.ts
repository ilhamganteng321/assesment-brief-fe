import type { UserRole } from "@/features/auth/types";
import { getLifecycleActionLabel } from "./labels";
import { getNextProjectStatuses, isProjectReadOnly } from "./lifecycle";
import type { Project, ProjectStatus } from "./types";

/**
 * UI-side mirror of the backend project policy.
 *
 * Every function here is **advisory**. It exists so the interface does not offer
 * an action the API is going to refuse, which is a usability concern rather than
 * a security one: the backend re-checks the role, the project visibility rule and
 * the lifecycle on every single request. Hiding a button is never the thing that
 * enforces a rule.
 *
 * Each function mirrors one named rule on the server, so the two can be compared
 * directly:
 *   - `canEditProject` / `canDeleteProject` -> `canUpdateProject` / `canDeleteProject`
 *   - `canChangeProjectStatus` -> `canChangeProjectStatus`
 *   - `getAvailableLifecycleActions` -> `validateProjectStatusTransition`
 *   - `canManageProjectMembers` / `canSearchProjectMemberCandidates` ->
 *     `canManageProjectMembers` / `canSearchProjectMemberCandidates`
 */

/** The authenticated user, or `undefined` while the session is still resolving. */
type Viewer = { role: UserRole | undefined };

/** Mirrors `canUpdateProject` (PROJECT_UPDATE): PM only. */
export function canEditProject(user: Viewer): boolean {
	return user.role === "PM";
}

/** Mirrors `canDeleteProject` (PROJECT_DELETE): PM only. */
export function canDeleteProject(user: Viewer): boolean {
	return user.role === "PM";
}

/**
 * Mirrors `canManageProjectMembers`: PM only.
 *
 * Adding and removing a member is the same decision, so it is one function —
 * the interface has no case where one is offered and the other is not, and the
 * server has no case either.
 */
export function canManageProjectMembers(user: Viewer): boolean {
	return user.role === "PM";
}

/**
 * Mirrors `canSearchProjectMemberCandidates`.
 *
 * The same gate as adding, which is the point: the search exists only to serve
 * the add flow, so it is not a user directory. An internal engineer who can open
 * a project is not offered the organisation's user list, and the server refuses
 * them the same way.
 */
export function canSearchProjectMemberCandidates(user: Viewer): boolean {
	return canManageProjectMembers(user);
}

/**
 * Whether this project's roster can be changed at all.
 *
 * An archived project is read-only, which the server enforces with 409
 * PROJECT_ARCHIVED on both the add and the remove path. The buttons are taken
 * away rather than left to fail, because "the project is archived" is a state a
 * person can see and a failed save is not.
 */
export function canManageProjectMembersNow(
	user: Viewer,
	project: Pick<Project, "status">,
): boolean {
	return canManageProjectMembers(user) && !isProjectReadOnly(project.status);
}

/**
 * Mirrors `canChangeProjectStatus`.
 *
 * The same permission as editing the project, not a new one: the lifecycle grants
 * nobody a permission they did not already have, it only constrains which status
 * a caller who may already update can set. An internal engineer and a client
 * guest are both refused here, and the server refuses them too.
 */
export function canChangeProjectStatus(user: Viewer): boolean {
	return user.role === "PM";
}

/**
 * Whether this project is editable at all, whoever is looking at it.
 *
 * A PM on a live or completed project may edit it. An archived project is
 * read-only for everyone, which the server enforces with 409 PROJECT_ARCHIVED, so
 * the interface stops offering inputs rather than letting a save fail.
 */
export function canEditProjectNow(user: Viewer, project: Project): boolean {
	return canEditProject(user) && !isProjectReadOnly(project.status);
}

export type LifecycleAction = {
	targetStatus: ProjectStatus;
	/** The button label, e.g. "Mark as Completed". */
	label: string;
}; /**
 * The lifecycle moves to offer, and nothing else.
 *
 * Only the one step the lifecycle allows, and only for a role the backend would
 * accept. A completed project offers "Archive Project"; an archived one offers
 * nothing, because there is no reopen. An internal user and a client guest are
 * offered nothing, because they may not move a project at all.
 */
export function getAvailableLifecycleActions(
	user: Viewer,
	project: Pick<Project, "status">,
): readonly LifecycleAction[] {
	if (!canChangeProjectStatus(user)) {
		return [];
	}

	return getNextProjectStatuses(project.status).map((targetStatus) => ({
		targetStatus,
		label: getLifecycleActionLabel(targetStatus),
	}));
}
