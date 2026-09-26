"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from "react";

import { shouldInvalidateSession } from "@/lib/api/error";
import { setUnauthorizedListener } from "@/lib/api/session-events";
import {
	clearAccessToken,
	getAccessToken,
	getAccessTokenAvailableSnapshot,
	getServerAccessTokenAvailableSnapshot,
	setAccessToken,
	subscribeToAccessToken,
} from "@/lib/api/token-storage";
import type { ApiError } from "@/lib/api/types";

import { logout as logoutRequest } from "./api";
import { authKeys, useCurrentUser } from "./hooks";
import { getLoginPath, isAuthPath } from "./redirects";
import { useAuthStore } from "./store";
import type { AuthSession, AuthUser } from "./types";

type AuthContextValue = {
	user: AuthUser | null;
	isAuthenticated: boolean;
	isInitialized: boolean;
	isLoading: boolean;
	isLoggingOut: boolean;
	error: ApiError | null;
	startSession: (session: AuthSession) => void;
	logout: () => Promise<void>;
	retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
	children: ReactNode;
};

function getCurrentInternalPath(pathname: string): string {
	if (typeof window === "undefined") {
		return pathname;
	}

	return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const router = useRouter();
	const pathname = usePathname();
	const queryClient = useQueryClient();
	const tokenAvailable = useSyncExternalStore(
		subscribeToAccessToken,
		getAccessTokenAvailableSnapshot,
		getServerAccessTokenAvailableSnapshot,
	);
	const user = useAuthStore((state) => state.user);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const isStoreLoading = useAuthStore((state) => state.isLoading);
	const setUser = useAuthStore((state) => state.setUser);
	const clearUser = useAuthStore((state) => state.clearUser);
	const setStoreLoading = useAuthStore((state) => state.setLoading);
	const [unauthorizedError, setUnauthorizedError] = useState<ApiError | null>(
		null,
	);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const currentUserQuery = useCurrentUser(tokenAvailable);
	const {
		data,
		error: queryError,
		isLoading: isQueryLoading,
		refetch,
	} = currentUserQuery;
	const error = queryError ?? unauthorizedError;

	const clearLocalSession = useCallback(() => {
		clearAccessToken();
		queryClient.clear();
		clearUser();
		setUnauthorizedError(null);
		setStoreLoading(false);
	}, [clearUser, queryClient, setStoreLoading]);

	const handleUnauthorized = useCallback(
		(unauthorizedError: ApiError, requestToken: string | null) => {
			if (requestToken !== getAccessToken()) {
				return;
			}

			const currentPath = getCurrentInternalPath(pathname);
			clearLocalSession();
			setUnauthorizedError(unauthorizedError);

			if (!isAuthPath(currentPath)) {
				router.replace(getLoginPath(currentPath, true));
			}
		},
		[clearLocalSession, pathname, router],
	);

	useEffect(
		() => setUnauthorizedListener(handleUnauthorized),
		[handleUnauthorized],
	);

	useEffect(() => {
		if (getAccessToken()) {
			setStoreLoading(true);
		} else {
			clearUser();
			setStoreLoading(false);
		}
	}, [clearUser, setStoreLoading]);

	useEffect(() => {
		if (!tokenAvailable || !data || !getAccessToken()) {
			return;
		}

		setUser(data);
	}, [data, setUser, tokenAvailable]);

	useEffect(() => {
		if (!tokenAvailable || !queryError) {
			return;
		}

		setStoreLoading(false);

		if (shouldInvalidateSession(queryError)) {
			clearUser();
		}
	}, [clearUser, queryError, setStoreLoading, tokenAvailable]);

	const startSession = useCallback(
		(session: AuthSession) => {
			setAccessToken(session.accessToken);
			queryClient.clear();
			queryClient.setQueryData(authKeys.currentUser, session.user);
			setUser(session.user);
			setUnauthorizedError(null);
			setStoreLoading(false);
		},
		[queryClient, setStoreLoading, setUser],
	);

	const logout = useCallback(async () => {
		setIsLoggingOut(true);
		const accessToken = getAccessToken();
		clearLocalSession();
		router.replace("/login");

		if (!accessToken) {
			setIsLoggingOut(false);
			return;
		}

		try {
			await logoutRequest(accessToken);
		} catch {
			return;
		} finally {
			setIsLoggingOut(false);
		}
	}, [clearLocalSession, router]);

	const retry = useCallback(() => {
		if (!getAccessToken()) {
			return;
		}

		setUnauthorizedError(null);
		setStoreLoading(true);
		void refetch();
	}, [refetch, setStoreLoading]);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			isAuthenticated,
			isInitialized: !isStoreLoading,
			isLoading: isStoreLoading || (tokenAvailable && isQueryLoading),
			isLoggingOut,
			error,
			startSession,
			logout,
			retry,
		}),
		[
			error,
			isAuthenticated,
			isLoggingOut,
			isQueryLoading,
			isStoreLoading,
			logout,
			retry,
			startSession,
			tokenAvailable,
			user,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}

	return context;
}
