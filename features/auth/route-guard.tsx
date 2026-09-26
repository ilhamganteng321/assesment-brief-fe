"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { AuthErrorState } from "./components/auth-error-state";
import { AuthLoading } from "./components/auth-loading";
import { useAuth } from "./provider";
import { getLoginPath, getPostAuthPath } from "./redirects";
import type { UserRole } from "./types";

type ProtectedRouteProps = {
	children: ReactNode;
};

function getCurrentInternalPath(pathname: string): string {
	if (typeof window === "undefined") {
		return pathname;
	}

	return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const router = useRouter();
	const pathname = usePathname();
	const { user, isLoading, error, retry } = useAuth();

	useEffect(() => {
		if (!isLoading && !user && !error) {
			router.replace(getLoginPath(getCurrentInternalPath(pathname)));
		}
	}, [error, isLoading, pathname, router, user]);

	if (isLoading) {
		return <AuthLoading className="min-h-svh" />;
	}

	if (!user && error && error.status !== 401) {
		return (
			<main className="flex min-h-svh items-center justify-center p-6">
				<AuthErrorState
					title="Unable to verify your session"
					description="We could not reach the server. Your session has not been cleared."
					onRetry={retry}
				/>
			</main>
		);
	}

	if (!user) {
		return (
			<AuthLoading className="min-h-svh" label="Redirecting to sign in..." />
		);
	}

	return children;
}

type PublicOnlyRouteProps = {
	children: ReactNode;
	redirectTo?: string;
};

export function PublicOnlyRoute({
	children,
	redirectTo,
}: PublicOnlyRouteProps) {
	const router = useRouter();
	const { user, isLoading, error, retry } = useAuth();
	const destination = getPostAuthPath(redirectTo);

	useEffect(() => {
		if (!isLoading && user) {
			router.replace(destination);
		}
	}, [destination, isLoading, router, user]);

	if (isLoading || user) {
		return <AuthLoading className="min-h-svh" />;
	}

	if (error && error.status !== 401) {
		return (
			<main className="flex min-h-svh items-center justify-center p-6">
				<AuthErrorState
					title="Unable to verify your session"
					description="We could not reach the server. Your session has not been cleared."
					onRetry={retry}
				/>
			</main>
		);
	}

	return children;
}

type RoleVisibilityProps = {
	roles: readonly UserRole[];
	children: ReactNode;
	fallback?: ReactNode;
};

export function RoleVisibility({
	roles,
	children,
	fallback = null,
}: RoleVisibilityProps) {
	const { user } = useAuth();

	if (!user || !roles.includes(user.role)) {
		return fallback;
	}

	return children;
}
