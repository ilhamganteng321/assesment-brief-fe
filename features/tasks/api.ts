import { apiClient } from "@/lib/api/client";
import { buildQueryParams } from "@/lib/api/query/serialize";
import type { ListQueryParams } from "@/lib/api/query/types";
import type { ApiSuccessResponse } from "@/lib/api/types";

import type {
	CreateTaskDependencyInput,
	CreateTaskPayload,
	Task,
	TaskAuditLogList,
	TaskAuditLogQuery,
	TaskDependency,
	TaskDependencyResponse,
	TaskDetail,
	TaskList,
	UpdateTaskPayload,
} from "./types";

export async function listTasks(
	params: ListQueryParams = {},
	signal?: AbortSignal,
): Promise<TaskList> {
	const response = await apiClient.get<ApiSuccessResponse<TaskList>>("/tasks", {
		params: buildQueryParams(params),
		signal,
	});
	return response.data.data;
}

/**
 * The tasks assigned to the caller.
 *
 * No user id is sent, and that is the whole design: the server resolves the
 * assignee from the verified access token and discards an `assignedToId` that
 * arrives in the filters, so this cannot be turned into "which projects does that
 * person work on". Passing `params.filters.assignedToId` here would be silently
 * ignored, which is why the signature takes the ordinary list query and nothing
 * more.
 */
export async function listMyTasks(
	params: ListQueryParams = {},
	signal?: AbortSignal,
): Promise<TaskList> {
	const response = await apiClient.get<ApiSuccessResponse<TaskList>>(
		"/tasks/my",
		{
			params: buildQueryParams(params),
			signal,
		},
	);
	return response.data.data;
}

export async function getTask(
	taskId: string,
	signal?: AbortSignal,
): Promise<TaskDetail> {
	const response = await apiClient.get<
		ApiSuccessResponse<{ task: TaskDetail }>
	>(`/tasks/${taskId}`, { signal });
	return response.data.data.task;
}

/** The flat create endpoint answers with the base task, not the detail view. */
export async function createTask(payload: CreateTaskPayload): Promise<Task> {
	const response = await apiClient.post<ApiSuccessResponse<{ task: Task }>>(
		"/tasks",
		payload,
	);
	return response.data.data.task;
}

export async function updateTask(
	taskId: string,
	payload: UpdateTaskPayload,
): Promise<TaskDetail> {
	const response = await apiClient.patch<
		ApiSuccessResponse<{ task: TaskDetail }>
	>(`/tasks/${taskId}`, payload);
	return response.data.data.task;
}

export async function deleteTask(
	taskId: string,
	version: number,
): Promise<void> {
	await apiClient.delete(`/tasks/${taskId}`, {
		params: { version },
	});
}

export async function listTaskDependencies(
	taskId: string,
	signal?: AbortSignal,
): Promise<TaskDependencyResponse> {
	const response = await apiClient.get<
		ApiSuccessResponse<TaskDependencyResponse>
	>(`/tasks/${taskId}/dependencies`, { signal });
	return response.data.data;
}

/**
 * `dependencyTaskId` is the *prerequisite* task, matching the server contract
 * used by the nested `/projects/:projectId/tasks/:taskId/dependencies` route.
 */
export async function createTaskDependency(
	taskId: string,
	input: CreateTaskDependencyInput,
): Promise<TaskDependency> {
	const response = await apiClient.post<
		ApiSuccessResponse<{ dependency: TaskDependency }>
	>(`/tasks/${taskId}/dependencies`, input);
	return response.data.data.dependency;
}

/** `dependencyId` is the prerequisite task id, exactly as listed by the API. */
export async function deleteTaskDependency(
	taskId: string,
	dependencyId: string,
): Promise<void> {
	await apiClient.delete(`/tasks/${taskId}/dependencies/${dependencyId}`);
}

/**
 * The immutable change history for one task. Read-only by design: the API
 * exposes no mutation route for audit records, so this module has no
 * counterpart that could rewrite history.
 *
 * Paging and the `changedColumn` filter are the two query options the audit
 * endpoint actually accepts; nothing else is invented, so an unsupported
 * parameter cannot be sent and be silently ignored.
 */
export async function listTaskAuditLogs(
	projectId: string,
	taskId: string,
	query: TaskAuditLogQuery = {},
	signal?: AbortSignal,
): Promise<TaskAuditLogList> {
	const response = await apiClient.get<ApiSuccessResponse<TaskAuditLogList>>(
		`/projects/${projectId}/tasks/${taskId}/audit-logs`,
		{ params: query, signal },
	);
	return response.data.data;
}
