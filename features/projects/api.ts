import { apiClient } from "@/lib/api/client";
import { buildQueryParams } from "@/lib/api/query/serialize";
import type { ListQueryParams } from "@/lib/api/query/types";
import type { ApiSuccessResponse } from "@/lib/api/types";

import type {
	ClientProjectList,
	ClientTaskList,
	ClientTaskListQuery,
	CreateProjectPayload,
	ProjectDetail,
	ProjectList,
	ProjectMemberList,
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
