import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/types";

function shouldRetry(failureCount: number, error: Error): boolean {
	if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
		return false;
	}

	return failureCount < 1;
}

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: shouldRetry,
				refetchOnWindowFocus: false,
				staleTime: 30_000,
			},
			mutations: {
				retry: false,
			},
		},
	});
}
