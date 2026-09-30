import type { UserRole } from "@/features/auth/types";

/**
 * UI-side mirror of the backend user policy.
 *
 * **Advisory**, in the same sense as the project and task permission modules: the
 * point is that the interface does not offer a page the API would refuse. The
 * backend re-checks `USER_READ` on every request, so hiding the navigation entry
 * and skipping the query is a usability measure and never the thing that enforces
 * the rule.
 *
 * The single named rule it mirrors is `Permission.USER_READ` in the backend
 * permission matrix, which is granted to PM only.
 */

/** The authenticated user, or `undefined` while the session is still resolving. */
type Viewer = { role: UserRole | undefined };

/**
 * Mirrors `canListUsers` / `canViewUser`.
 *
 * A project manager browses the directory to find somebody to put on a project.
 * An internal user is a team member rather than an administrator of the org chart,
 * and a client guest must never be able to enumerate the internal team — so
 * neither is offered the page.
 */
export function canBrowseUserDirectory(user: Viewer): boolean {
	return user.role === "PM";
}
