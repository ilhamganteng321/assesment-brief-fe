import { apiClient } from "@/lib/api/client";
import { buildQueryParams } from "@/lib/api/query/serialize";
import type { ListQueryParams } from "@/lib/api/query/types";
import type { ApiSuccessResponse } from "@/lib/api/types";

import type {
	ClientProjectList,
	ClientTask,
	ClientTaskList,
	ClientTaskListQuery,
	CreateProjectPayload,
	ProjectActivityList,
	ProjectDetail,
	ProjectList,
	ProjectMemberList,
	ProjectMetrics,
	ProjectMetricsDetail,
	UpdateProjectPayload,
} from "./types";

export async function listProjects(
	params: ListQueryParams = {},
	signal?: AbortSignal,
): Promise<ProjectList> {
	const response = await apiClient.get<ApiSuccessResponse<ProjectList>>(
		"/projects",
		{
			params: buildQueryParams(params),
			signal,
		},
	);
	return response.data.data;
}

export async function getProject(
	projectId: string,
	signal?: AbortSignal,
): Promise<ProjectDetail> {
	const response = await apiClient.get<ApiSuccessResponse<ProjectDetail>>(
		`/projects/${projectId}`,
		{ signal },
	);
	return response.data.data;
}

export async function createProject(
	payload: CreateProjectPayload,
): Promise<ProjectDetail> {
	const response = await apiClient.post<ApiSuccessResponse<ProjectDetail>>(
		"/projects",
		payload,
	);
	return response.data.data;
}

export async function updateProject(
	projectId: string,
	payload: UpdateProjectPayload,
): Promise<ProjectDetail> {
	const response = await apiClient.patch<ApiSuccessResponse<ProjectDetail>>(
		`/projects/${projectId}`,
		payload,
	);
	return response.data.data;
}

export async function archiveProject(projectId: string): Promise<void> {
	await apiClient.delete(`/projects/${projectId}`);
}

export async function listProjectMembers(
	projectId: string,
	signal?: AbortSignal,
): Promise<ProjectMemberList> {
	const response = await apiClient.get<ApiSuccessResponse<ProjectMemberList>>(
		`/projects/${projectId}/members`,
		{ signal },
	);
	return response.data.data;
}

export async function getClientProjects(
	signal?: AbortSignal,
): Promise<ClientProjectList> {
	const response = await apiClient.get<ApiSuccessResponse<ClientProjectList>>(
		"/client/dashboard",
		{ signal },
	);
	return response.data.data;
}

export async function getClientProjectTasks(
	projectId: string,
	query: ClientTaskListQuery = {},
	signal?: AbortSignal,
): Promise<ClientTaskList> {
	const response = await apiClient.get<ApiSuccessResponse<ClientTaskList>>(
		`/client/projects/${projectId}/tasks`,
		{ params: query, signal },
	);
	return response.data.data;
}

/**
 * Project task counts, straight from the server.
 *
 * The dashboard deliberately does not total up a page of task rows: the counts
 * come from database aggregates so the numbers cannot drift from the filter and
 * paging rules, and so a large project does not have to be downloaded to draw a
 * summary.
 */
export async function getProjectMetrics(
	projectId: string,
	signal?: AbortSignal,
): Promise<ProjectMetrics> {
	const response = await apiClient.get<
		ApiSuccessResponse<ProjectMetricsDetail>
	>(`/projects/${projectId}/metrics`, { signal });
	return response.data.data.metrics;
}

/** The project's newest audit entries, newest first. */
export async function getProjectActivity(
	projectId: string,
	limit = 10,
	signal?: AbortSignal,
): Promise<ProjectActivityList> {
	const response = await apiClient.get<ApiSuccessResponse<ProjectActivityList>>(
		`/projects/${projectId}/activity`,
		{ params: { page: 1, limit }, signal },
	);
	return response.data.data;
}

/**
 * The client's own copy of one task.
 *
 * A separate function from `getTask` on purpose: this is the only task read a
 * client guest is allowed to make, and it returns a projection without an
 * assignee, a department, a version, or any audit history.
 */
export async function getClientProjectTask(
	projectId: string,
	taskId: string,
	signal?: AbortSignal,
): Promise<ClientTask> {
	const response = await apiClient.get<
		ApiSuccessResponse<{ task: ClientTask }>
	>(`/client/projects/${projectId}/tasks/${taskId}`, { signal });
	return response.data.data.task;
}
