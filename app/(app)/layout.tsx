"use client";

import type { ReactNode } from "react";

import { UserMenu } from "@/features/auth/components/user-menu";
import { ProtectedRoute } from "@/features/auth/route-guard";
import {
	AppNavigation,
	BrandMark,
} from "@/features/navigation/components/app-navigation";
import { MobileNavigation } from "@/features/navigation/components/mobile-navigation";

type AuthenticatedLayoutProps = {
	children: ReactNode;
};

export default function AuthenticatedLayout({
	children,
}: AuthenticatedLayoutProps) {
	return (
		<ProtectedRoute>
			<div className="flex min-h-svh w-full bg-muted/30">
				<aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
					<BrandMark className="px-2" />
					<AppNavigation className="flex-1" />
					<p className="px-3 text-xs text-muted-foreground">
						Role-based access is enforced by the server.
					</p>
				</aside>
				<div className="flex min-w-0 flex-1 flex-col">
					<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
						<div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
							<div className="flex items-center gap-2">
								<MobileNavigation />
								<BrandMark className="lg:hidden" compact />
							</div>
							<div className="flex items-center gap-2">
								<UserMenu />
							</div>
						</div>
					</header>
					<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
						{children}
					</main>
				</div>
			</div>
		</ProtectedRoute>
	);
}
