"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/features/auth/provider";
import {
	APP_NAME,
	getVisibleNavItems,
	isNavItemActive,
} from "@/features/navigation/config";

type BrandMarkProps = {
	className?: string;
	compact?: boolean;
};

export function BrandMark({ className, compact = false }: BrandMarkProps) {
	return (
		<Link
			href="/dashboard"
			className={cn(
				"inline-flex min-h-11 items-center gap-2 rounded-md font-heading text-base font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
				className,
			)}
		>
			<span
				aria-hidden="true"
				className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
			>
				PO
			</span>
			<span className={compact ? "hidden sm:inline" : undefined}>
				{APP_NAME}
			</span>
		</Link>
	);
}

type AppNavigationProps = {
	onNavigate?: () => void;
	className?: string;
};

export function AppNavigation({ onNavigate, className }: AppNavigationProps) {
	const pathname = usePathname();
	const { user } = useAuth();
	const items = user ? getVisibleNavItems(user.role) : [];

	return (
		<nav aria-label="Main" className={cn("flex flex-col gap-1", className)}>
			{items.map((item) => {
				const IconComponent = item.icon;
				const isActive = isNavItemActive(pathname, item.href);

				return (
					<Link
						key={item.href}
						href={item.href}
						aria-current={isActive ? "page" : undefined}
						onClick={onNavigate}
						className={cn(
							"flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
							isActive
								? "bg-sidebar-accent text-sidebar-accent-foreground"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<IconComponent aria-hidden="true" weight="bold" />
						<span className="flex flex-col">
							<span>{item.label}</span>
							<span className="text-xs font-normal text-muted-foreground">
								{item.description}
							</span>
						</span>
					</Link>
				);
			})}
		</nav>
	);
}
