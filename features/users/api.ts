import { apiClient } from "@/lib/api/client";
import { buildQueryParams } from "@/lib/api/query/serialize";
import type { ListQueryParams } from "@/lib/api/query/types";
import type { ApiSuccessResponse } from "@/lib/api/types";

import type { UserDetail, UserList } from "./types";

/**
 * The team directory.
 *
 * Paged, filtered, searched and sorted by the server. The account table is the
 * one collection in this application with no natural bound, so nothing here
 * fetches a list to filter locally — the browser only ever holds one page.
 */
export async function listUsers(
	params: ListQueryParams = {},
	signal?: AbortSignal,
): Promise<UserList> {
	const response = await apiClient.get<ApiSuccessResponse<UserList>>("/users", {
		params: buildQueryParams(params),
		signal,
	});
	return response.data.data;
}

/**
 * One person's safe profile.
 *
 * Returns the same six fields as the list. Opening a profile is not a way to see
 * a person's projects or their work: the server decides that, and it decides it
 * per project, not per user.
 */
export async function getUser(
	userId: string,
	signal?: AbortSignal,
): Promise<UserDetail> {
	const response = await apiClient.get<ApiSuccessResponse<UserDetail>>(
		`/users/${userId}`,
		{ signal },
	);
	return response.data.data;
}
