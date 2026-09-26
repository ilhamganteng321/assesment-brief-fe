import { useQuery } from "@tanstack/react-query";

import type { ApiError } from "@/lib/api/types";

import { getCurrentUser } from "./api";
import type { AuthUser } from "./types";

export const authKeys = {
	all: ["auth"] as const,
	currentUser: ["auth", "current-user"] as const,
};

export function useCurrentUser(enabled = true) {
	return useQuery<AuthUser, ApiError>({
		queryKey: authKeys.currentUser,
		queryFn: ({ signal }) => getCurrentUser(signal),
		enabled,
		refetchOnWindowFocus: true,
		staleTime: 60_000,
	});
}
