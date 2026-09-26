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
	archiveProject,
	createProject,
	getClientProjects,
	getClientProjectTask,
	getClientProjectTasks,
	getProject,
	getProjectActivity,
	getProjectMetrics,
	listProjectMembers,
	listProjects,
	updateProject,
} from "./api";
import type {
	ClientTaskListQuery,
	CreateProjectPayload,
	UpdateProjectPayload,
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
				queryClient.invalidateQueries({ queryKey: projectKeys.lists() }),
				queryClient.invalidateQueries({
					queryKey: projectKeys.detail(projectId),
				}),
			]);
		},
	});
}

export function useArchiveProject(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (projectId: string) => {
			assertProjectManager(role);
			return archiveProject(projectId);
		},
		onSuccess: async (_data, projectId) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: projectKeys.lists() }),
				queryClient.invalidateQueries({
					queryKey: projectKeys.detail(projectId),
				}),
			]);
		},
	});
}
