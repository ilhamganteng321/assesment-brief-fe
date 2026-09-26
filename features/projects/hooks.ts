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
	getClientProjectTasks,
	getProject,
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
