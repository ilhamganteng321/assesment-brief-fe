import { useQuery } from "@tanstack/react-query";

import type { UserRole } from "@/features/auth/types";
import { normalizeListQueryParams } from "@/lib/api/query/normalize";
import type { ListQueryParams } from "@/lib/api/query/types";

import { getUser, listUsers } from "./api";
import { canBrowseUserDirectory } from "./permissions";

/**
 * Query keys for the directory.
 *
 * The list key is built from the *normalized* query rather than the raw object,
 * so two requests that would produce the same URL cannot become two cache
 * entries. Without that, a caller passing a freshly-constructed filters object
 * would miss the cache on every render and refetch a list that never changed.
 */
export const userKeys = {
	all: ["users"] as const,
	lists: () => [...userKeys.all, "list"] as const,
	list: (role: UserRole | undefined, query: ListQueryParams = {}) =>
		[
			...userKeys.lists(),
			role ?? "PM",
			normalizeListQueryParams(query),
		] as const,
	details: () => [...userKeys.all, "detail"] as const,
	detail: (userId: string) => [...userKeys.details(), userId] as const,
};

/**
 * The directory page.
 *
 * The query is disabled outright for a role the server would refuse, rather than
 * being attempted and turned into an error state. `/users` is answered with 403
 * for everyone but a project manager, so not asking means an internal user or a
 * client guest never sees a failure on a page they were not offered — and it
 * keeps the organisation's account list out of a session that has no business
 * having it.
 */
export function useUsers(
	role: UserRole | undefined,
	query: ListQueryParams = {},
) {
	return useQuery({
		queryKey: userKeys.list(role, query),
		queryFn: async ({ signal }) => listUsers(query, signal),
		enabled: canBrowseUserDirectory({ role }),
		// Keeps the previous page on screen while the next one loads, so paging
		// does not collapse the list to a skeleton between clicks.
		placeholderData: (previous) => previous,
	});
}

/**
 * One person's profile, on the same gate as the list.
 *
 * There are no mutations in this module, and deliberately: the directory is for
 * browsing and finding people. The endpoints that would change a user — a role, a
 * department, a credential — do not exist, so there is nothing to invalidate
 * after.
 */
export function useUser(role: UserRole | undefined, userId: string) {
	return useQuery({
		queryKey: userKeys.detail(userId),
		queryFn: async ({ signal }) => (await getUser(userId, signal)).user,
		enabled: canBrowseUserDirectory({ role }) && userId.length > 0,
	});
}
