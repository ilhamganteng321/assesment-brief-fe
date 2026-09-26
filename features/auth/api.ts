import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/lib/api/types";

import type {
	AuthSession,
	CurrentUserResponse,
	LoginRequest,
	LogoutResponse,
	RegisterRequest,
} from "./types";

export async function login(request: LoginRequest): Promise<AuthSession> {
	const response = await apiClient.post<ApiSuccessResponse<AuthSession>>(
		"/auth/login",
		request,
	);
	return response.data.data;
}

export async function register(request: RegisterRequest): Promise<AuthSession> {
	const response = await apiClient.post<ApiSuccessResponse<AuthSession>>(
		"/auth/register",
		request,
	);
	return response.data.data;
}

export async function logout(accessToken: string): Promise<LogoutResponse> {
	const response = await apiClient.post<LogoutResponse>(
		"/auth/logout",
		undefined,
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);
	return response.data;
}

export async function getCurrentUser(
	signal?: AbortSignal,
): Promise<CurrentUserResponse["user"]> {
	const response = await apiClient.get<ApiSuccessResponse<CurrentUserResponse>>(
		"/auth/me",
		{ signal },
	);
	return response.data.data.user;
}
