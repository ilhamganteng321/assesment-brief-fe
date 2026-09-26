import axios, { AxiosHeaders, type AxiosRequestConfig } from "axios";

import { getBackendUrl } from "./env";
import { normalizeApiError, shouldInvalidateSession } from "./error";
import { notifyUnauthorized } from "./session-events";
import { getAccessToken } from "./token-storage";
import { ApiError } from "./types";

function getRequestAccessToken(
	config: AxiosRequestConfig | undefined,
): string | null {
	if (!config?.headers) {
		return null;
	}

	const headers: unknown = config.headers;
	const authorization =
		headers instanceof AxiosHeaders
			? headers.get("Authorization")
			: typeof headers === "object" && headers !== null
				? ((headers as Record<string, unknown>).Authorization ??
					(headers as Record<string, unknown>).authorization)
				: null;

	if (
		typeof authorization !== "string" ||
		!authorization.startsWith("Bearer ")
	) {
		return null;
	}

	return authorization.slice("Bearer ".length) || null;
}

export const apiClient = axios.create({
	baseURL: getBackendUrl(),
	timeout: 15_000,
	withCredentials: false,
	headers: {
		Accept: "application/json",
		"Content-Type": "application/json",
	},
});

apiClient.interceptors.request.use((config) => {
	const baseURL = config.baseURL ?? getBackendUrl();

	if (!baseURL) {
		throw new ApiError("The backend URL is not configured.", {
			code: "INVALID_CONFIGURATION",
		});
	}

	config.baseURL = baseURL;
	config.headers.set("Content-Type", "application/json");

	const requestId = globalThis.crypto?.randomUUID?.();
	if (requestId) {
		config.headers.set("X-Request-ID", requestId);
	}

	const token = getAccessToken();
	const configuredAuthorization = config.headers.get("Authorization");

	if (token) {
		config.headers.set("Authorization", `Bearer ${token}`);
	} else if (!configuredAuthorization) {
		config.headers.delete("Authorization");
	}

	return config;
});

apiClient.interceptors.response.use(
	(response) => response,
	(error: unknown) => {
		const apiError = normalizeApiError(error);

		if (shouldInvalidateSession(apiError)) {
			const requestToken = axios.isAxiosError(error)
				? getRequestAccessToken(error.config)
				: null;
			notifyUnauthorized(apiError, requestToken);
		}

		return Promise.reject(apiError);
	},
);
