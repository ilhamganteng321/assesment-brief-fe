import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";

import type { UserRole } from "@/features/auth/types";
import { normalizeListQueryParams } from "@/lib/api/query/normalize";
import type { ListQueryParams } from "@/lib/api/query/types";

import {
	addProjectMember,
	createProject,
	deleteProject,
	getClientProjects,
	getClientProjectTask,
	getClientProjectTasks,
	getProject,
	getProjectActivity,
	getProjectMetrics,
	listProjectMembers,
	listProjects,
	removeProjectMember,
	searchProjectMemberCandidates,
	updateProject,
	updateProjectStatus,
} from "./api";
import { MIN_MEMBER_CANDIDATE_SEARCH } from "./member-search";
import { canManageProjectMembers } from "./permissions";
import type {
	ClientTaskListQuery,
	CreateProjectPayload,
	UpdateProjectPayload,
	UpdateProjectStatusPayload,
} from "./types";

export const projectKeys = {
	all: ["projects"] as const,
	lists: () => [...projectKeys.all, "list"] as const,
	list: (role: UserRole, query: ListQueryParams = {}) =>
		[...projectKeys.lists(), role, normalizeListQueryParams(query)] as const,
	clientTaskLists: () => [...projectKeys.all, "client-task-list"] as const,
	clientTaskList: (projectId: string, query: ClientTaskListQuery) =>
		[
			...projectKeys.clientTaskLists(),
			projectId,
			query.page ?? 1,
			query.limit ?? 20,
			query.status ?? "all",
			query.search ?? "",
		] as const,
	details: () => [...projectKeys.all, "detail"] as const,
	detail: (projectId: string) => [...projectKeys.details(), projectId] as const,
	members: (projectId: string) =>
		[...projectKeys.details(), projectId, "members"] as const,
	/**
	 * One search of the candidate endpoint.
	 *
	 * Keyed on the search text, so typing narrows the cache rather than replacing
	 * it, and revisiting a term the user already typed is a cache hit instead of
	 * another request.
	 */
	memberCandidates: (projectId: string, search: string) =>
		[...projectKeys.details(), projectId, "member-candidates", search] as const,
	metrics: (projectId: string) =>
		[...projectKeys.details(), projectId, "metrics"] as const,
	activity: (projectId: string) =>
		[...projectKeys.details(), projectId, "activity"] as const,
	/**
	 * Every project-scoped read for one project.
	 *
	 * A task mutation changes the task rows, the counts derived from them, and
	 * the history they append to, so invalidating this prefix refreshes the whole
	 * dashboard in one call. It is still scoped to a single project rather than
	 * the entire cache.
	 */
	dashboard: (projectId: string) =>
		[...projectKeys.details(), projectId] as const,
};

function isClientRole(role: UserRole | undefined): boolean {
	return role === "CLIENT";
}

function isProjectManager(role: UserRole | undefined): boolean {
	return role === "PM";
}

export function useProjectList(
	role: UserRole | undefined,
	query: ListQueryParams = {},
) {
	return useQuery({
		queryKey: projectKeys.list(role ?? "PM", query),
		queryFn: async ({ signal }) => listProjects(query, signal),
		enabled: Boolean(role) && !isClientRole(role),
		placeholderData: keepPreviousData,
	});
}

export function useClientProjectList(role: UserRole | undefined) {
	return useQuery({
		queryKey: projectKeys.list("CLIENT"),
		queryFn: async ({ signal }) => (await getClientProjects(signal)).projects,
		enabled: isClientRole(role),
	});
}

export function useProjectDetail(
	role: UserRole | undefined,
	projectId: string,
) {
	return useQuery({
		queryKey: projectKeys.detail(projectId),
		queryFn: async ({ signal }) =>
			(await getProject(projectId, signal)).project,
		enabled: Boolean(role) && !isClientRole(role) && Boolean(projectId),
	});
}

export function useProjectMembers(
	role: UserRole | undefined,
	projectId: string,
) {
	return useQuery({
		queryKey: projectKeys.members(projectId),
		queryFn: async ({ signal }) =>
			(await listProjectMembers(projectId, signal)).members,
		enabled: Boolean(role) && !isClientRole(role) && Boolean(projectId),
	});
}

/**
 * Searches for people who could be added to a project.
 *
 * The query is disabled outright for a role that could not act on the answer,
 * rather than being attempted and refused. The server would answer 403 either
 * way, but not asking means a project manager's dialog cannot put an internal
 * engineer's browser into an error state, and it keeps the organisation's user
 * list out of a session that has no business having it.
 *
 * An empty or too-short search never reaches the network: the endpoint would
 * answer with an empty page, and asking on every keystroke of a cleared field
 * would be pure noise.
 */
export function useProjectMemberCandidates(
	role: UserRole | undefined,
	projectId: string,
	search: string,
) {
	const trimmed = search.trim();
	const isSearchable = trimmed.length >= MIN_MEMBER_CANDIDATE_SEARCH;

	return useQuery({
		queryKey: projectKeys.memberCandidates(projectId, trimmed),
		queryFn: async ({ signal }) =>
			searchProjectMemberCandidates(projectId, { search: trimmed }, signal),
		enabled:
			canManageProjectMembers({ role }) && isSearchable && projectId.length > 0,
		// Results for a term the user has already moved on from are not worth
		// keeping: the next keystroke supersedes them.
		gcTime: 0,
	});
}

/**
 * Adds a member.
 *
 * No optimistic update, deliberately. Membership is the grant that opens a
 * project to somebody, so the interface should show what the server actually
 * did rather than a guess that might have to be rolled back — particularly since
 * a duplicate or an archived project is refused, and both are far more useful
 * reported after the fact than pre-empted in the browser.
 *
 * Invalidating the member list is the point: the server is the source of truth
 * for who is on the project, so the list is refetched rather than patched. The
 * candidate searches for this project are dropped too, because the person just
 * added is now a member and their row would otherwise linger as "already a
 * member" in a list the user has not navigated away from.
 */
export function useAddProjectMember(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			userId,
		}: {
			projectId: string;
			userId: string;
		}) => {
			assertProjectManager(role);
			return addProjectMember(projectId, { userId });
		},
		onSuccess: async (_member, { projectId }) => {
			queryClient.removeQueries({
				queryKey: [...projectKeys.details(), projectId, "member-candidates"],
			});
			await queryClient.invalidateQueries({
				queryKey: projectKeys.members(projectId),
			});
		},
	});
}

/**
 * Removes a member.
 *
 * Invalidates the same two things as adding, for the same reason: the server
 * decides the outcome, and the list is refetched to match. Scoped to this one
 * project rather than the whole cache.
 */
export function useRemoveProjectMember(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			userId,
		}: {
			projectId: string;
			userId: string;
		}) => {
			assertProjectManager(role);
			return removeProjectMember(projectId, userId);
		},
		onSuccess: async (_data, { projectId }) => {
			queryClient.removeQueries({
				queryKey: [...projectKeys.details(), projectId, "member-candidates"],
			});
			await queryClient.invalidateQueries({
				queryKey: projectKeys.members(projectId),
			});
		},
	});
}

export function useClientProject(
	role: UserRole | undefined,
	projectId: string,
) {
	return useQuery({
		queryKey: projectKeys.list("CLIENT"),
		queryFn: async ({ signal }) => (await getClientProjects(signal)).projects,
		enabled: isClientRole(role) && Boolean(projectId),
		select: (projects) =>
			projects.find((project) => project.id === projectId) ?? null,
	});
}

export function useClientProjectTasks(
	role: UserRole | undefined,
	projectId: string,
	query: ClientTaskListQuery,
) {
	return useQuery({
		queryKey: projectKeys.clientTaskList(projectId, query),
		queryFn: async ({ signal }) =>
			getClientProjectTasks(projectId, query, signal),
		enabled: isClientRole(role) && Boolean(projectId),
		placeholderData: keepPreviousData,
	});
}

/**
 * Project counts for the dashboard.
 *
 * Internal only: a client guest reads the scoped `/client/dashboard` payload
 * instead, which is computed over client-visible tasks. Requesting this for a
 * client would be answered with a 403, so the query is not attempted.
 */
export function useProjectMetrics(
	role: UserRole | undefined,
	projectId: string,
) {
	return useQuery({
		queryKey: projectKeys.metrics(projectId),
		queryFn: async ({ signal }) => getProjectMetrics(projectId, signal),
		enabled: Boolean(role) && !isClientRole(role) && projectId.length > 0,
	});
}

/** Recent project history, newest first. Internal only, like the metrics. */
export function useProjectActivity(
	role: UserRole | undefined,
	projectId: string,
	limit = 10,
) {
	return useQuery({
		queryKey: projectKeys.activity(projectId),
		queryFn: async ({ signal }) => getProjectActivity(projectId, limit, signal),
		enabled: Boolean(role) && !isClientRole(role) && projectId.length > 0,
	});
}

/**
 * A single task as a client guest is allowed to see it.
 *
 * This deliberately reads `/client/...` rather than the internal task route, so
 * the restricted projection comes from the server and the component has no
 * internal field to accidentally render.
 */
export function useClientProjectTask(
	role: UserRole | undefined,
	projectId: string,
	taskId: string,
) {
	return useQuery({
		queryKey: [
			...projectKeys.clientTaskLists(),
			projectId,
			"detail",
			taskId,
		] as const,
		queryFn: async ({ signal }) =>
			getClientProjectTask(projectId, taskId, signal),
		enabled: isClientRole(role) && projectId.length > 0 && taskId.length > 0,
	});
}

function assertProjectManager(role: UserRole | undefined): void {
	if (!isProjectManager(role)) {
		throw new Error("Only project managers can modify projects.");
	}
}

export function useCreateProject(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateProjectPayload) => {
			assertProjectManager(role);
			return createProject(payload);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
		},
	});
}

export function useUpdateProject(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			payload,
		}: {
			projectId: string;
			payload: UpdateProjectPayload;
		}) => {
			assertProjectManager(role);
			return updateProject(projectId, payload);
		},
		onSuccess: async (_data, { projectId }) => {
			await Promise.all([
				// A rename is visible in the list as well as on the page it was made
				// from, and in a client's own read-only list of their projects.
				queryClient.invalidateQueries({ queryKey: projectKeys.lists() }),
				queryClient.invalidateQueries({
					queryKey: projectKeys.detail(projectId),
				}),
			]);
		},
	});
}

/**
 * Moves a project along its lifecycle.
 *
 * One move touches three things: the project row, the position it holds in the
 * list, and the set of controls the page offers next — completing a project
 * changes the list's status filter results, and archiving makes every other
 * control disappear. The invalidation is scoped to this one project's prefix and
 * to the list, so completing a project in one place does not refetch every other
 * dashboard.
 */
export function useUpdateProjectStatus(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			payload,
		}: {
			projectId: string;
			payload: UpdateProjectStatusPayload;
		}) => {
			assertProjectManager(role);
			return updateProjectStatus(projectId, payload);
		},
		onSuccess: async (_data, { projectId }) => {
			await Promise.all([
				// The status column of every list, including one currently filtered
				// by the status the project just left.
				queryClient.invalidateQueries({ queryKey: projectKeys.lists() }),
				// The project row itself, plus the metrics and activity cached under
				// its prefix, so the header and the dashboard agree with the server.
				queryClient.invalidateQueries({
					queryKey: projectKeys.dashboard(projectId),
				}),
			]);
		},
	});
}

/**
 * Soft-deletes a project.
 *
 * The row is retained, so there is nothing to refetch for this project: the
 * detail query is dropped rather than invalidated, because a deleted project is
 * not retrievable and an invalidated query would only refetch to be told 404.
 */
export function useDeleteProject(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (projectId: string) => {
			assertProjectManager(role);
			return deleteProject(projectId);
		},
		onSuccess: async (_data, projectId) => {
			queryClient.removeQueries({ queryKey: projectKeys.dashboard(projectId) });
			await queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
		},
	});
}
