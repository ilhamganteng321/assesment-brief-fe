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
	createTask as createTaskRequest,
	deleteTask as deleteTaskRequest,
	getTask as getTaskRequest,
	listTasks as listTasksRequest,
	updateTask as updateTaskRequest,
} from "./api";
import type { CreateTaskPayload, UpdateTaskPayload } from "./types";

export const taskKeys = {
	all: ["tasks"] as const,
	lists: () => [...taskKeys.all, "list"] as const,
	list: (role: UserRole, query: ListQueryParams = {}) =>
		[...taskKeys.lists(), role, normalizeListQueryParams(query)] as const,
	details: () => [...taskKeys.all, "detail"] as const,
	detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
};

function isClientRole(role: UserRole | undefined): boolean {
	return role === "CLIENT";
}

function isProjectManager(role: UserRole | undefined): boolean {
	return role === "PM";
}

/**
 * The flat task API is internal-only, so the query is disabled outright for
 * clients rather than relying on a 403 to surface as an error state.
 */
export function useTaskList(
	role: UserRole | undefined,
	query: ListQueryParams,
) {
	return useQuery({
		queryKey: taskKeys.list(role ?? "PM", query),
		queryFn: async ({ signal }) => listTasksRequest(query, signal),
		enabled: Boolean(role) && !isClientRole(role),
		placeholderData: keepPreviousData,
	});
}

export function useTaskDetail(role: UserRole | undefined, taskId: string) {
	return useQuery({
		queryKey: taskKeys.detail(taskId),
		queryFn: async ({ signal }) => getTaskRequest(taskId, signal),
		enabled: Boolean(role) && !isClientRole(role) && taskId.length > 0,
	});
}

export function useCreateTask(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: CreateTaskPayload) => {
			assertProjectManager(role);
			return createTaskRequest(payload);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
		},
	});
}

export function useUpdateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			taskId,
			payload,
		}: {
			taskId: string;
			payload: UpdateTaskPayload;
		}) => updateTaskRequest(taskId, payload),
		onSuccess: async (_data, { taskId }) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
				queryClient.invalidateQueries({
					queryKey: taskKeys.detail(taskId),
				}),
			]);
		},
	});
}

export function useDeleteTask(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ taskId, version }: { taskId: string; version: number }) => {
			assertProjectManager(role);
			return deleteTaskRequest(taskId, version);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
		},
	});
}

function assertProjectManager(role: UserRole | undefined): void {
	if (!isProjectManager(role)) {
		throw new Error("Only project managers can modify tasks.");
	}
}
