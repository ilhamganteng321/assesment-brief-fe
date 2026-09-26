import { apiClient } from "@/lib/api/client";
import { buildQueryParams } from "@/lib/api/query/serialize";
import type { ListQueryParams } from "@/lib/api/query/types";
import type { ApiSuccessResponse } from "@/lib/api/types";

import type {
	CreateTaskPayload,
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

export async function getTask(
	taskId: string,
	signal?: AbortSignal,
): Promise<TaskDetail> {
	const response = await apiClient.get<
		ApiSuccessResponse<{ task: TaskDetail }>
	>(`/tasks/${taskId}`, { signal });
	return response.data.data.task;
}

export async function createTask(
	payload: CreateTaskPayload,
): Promise<TaskDetail> {
	const response = await apiClient.post<
		ApiSuccessResponse<{ task: TaskDetail }>
	>("/tasks", payload);
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
