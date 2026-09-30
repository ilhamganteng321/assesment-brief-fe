import type { UserRole } from "@/features/auth/types";
import { isProjectReadOnly } from "@/features/projects/lifecycle";
import type { Project } from "@/features/projects/types";

import type { InvitationStatus } from "./types";

/**
 * UI-side mirror of the backend invitation policy. **Advisory**, like its siblings
 * in `features/projects/permissions.ts`: it exists so the interface does not offer
 * a control the API is about to refuse, and the server re-checks the role, the
 * project visibility rule and the lifecycle on every request. Hiding a button is
 * never what enforces a rule.
 *
 * Each function mirrors one named rule on the server:
 *   - `canManageProjectInvitations` -> `canManageProjectInvitations` (PM only)
 *   - `canManageProjectInvitationsNow` -> the archived-project refusals
 */

/** The authenticated user, or `undefined` while the session is still resolving. */
type Viewer = { role: UserRole | undefined };

/**
 * Mirrors `canManageProjectInvitations`: PM only.
 *
 * An invitation is a membership that has not happened yet, so whoever may add a
 * member may send one. The server has no separate rule to drift from.
 */
export function canManageProjectInvitations(user: Viewer): boolean {
	return user.role === "PM";
}

/**
 * Whether invitations can be managed on this project right now.
 *
 * An archived project refuses new invitations, resends and cancellations with 409
 * PROJECT_ARCHIVED, because who may join is part of the record that was closed.
 * The controls are taken away rather than left to fail, since "this project is
 * archived" is a state a person can see and a failed save is not.
 */
export function canManageProjectInvitationsNow(
	user: Viewer,
	project: Pick<Project, "status">,
): boolean {
	return (
		canManageProjectInvitations(user) && !isProjectReadOnly(project.status)
	);
}

/**
 * Whether an invitation can be acted on.
 *
 * Accepted is final and has no recovery — the membership exists, so a resend would
 * offer to join something the recipient is already on, and a cancellation would
 * claim a withdrawal that did not happen. Both refusals come from the server, and
 * offering the control would only produce an error.
 */
export function canResendInvitation(status: InvitationStatus): boolean {
	return status !== "ACCEPTED";
}

/**
 * Whether an invitation can be withdrawn.
 *
 * The same rule as resending, for the same reason.
 */
export function canCancelInvitation(status: InvitationStatus): boolean {
	return status !== "ACCEPTED";
}

/**
 * Whether the recipient should be offered the accept button.
 *
 * Deliberately the server's `usable` rather than anything derived here. The
 * identity half of that decision — is this invitation addressed to the account that
 * happens to be signed in — is not knowable in the browser, and a local guess
 * would either hide a button that would have worked or offer one that cannot.
 */
export function canAcceptInvitation(usable: boolean): boolean {
	return usable;
}
