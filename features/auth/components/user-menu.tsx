"use client";

import { SignOutIcon, UserCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "../provider";
import { getRoleLabel } from "../role-labels";

export function UserMenu() {
	const { user, logout, isLoggingOut } = useAuth();

	if (!user) {
		return null;
	}

	const initials = user.name
		.split(" ")
		.map((part) => part.charAt(0))
		.filter(Boolean)
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Open account menu"
				className="inline-flex min-h-11 items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<span
					aria-hidden="true"
					className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary dark:bg-primary/20"
				>
					{initials}
				</span>
				<span className="hidden max-w-40 truncate text-sm font-medium md:inline">
					{user.name}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel className="flex flex-col gap-0.5 normal-case">
					<span className="truncate text-sm font-medium text-foreground">
						{user.name}
					</span>
					<span className="truncate text-xs font-normal text-muted-foreground">
						{user.email}
					</span>
					<span className="mt-1 text-xs font-medium text-muted-foreground">
						{getRoleLabel(user.role)} · {user.department.replaceAll("_", " ")}
					</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem render={<Link href="/settings" />}>
					<UserCircleIcon aria-hidden="true" />
					Profile settings
				</DropdownMenuItem>
				<DropdownMenuItem disabled={isLoggingOut} onClick={() => void logout()}>
					<SignOutIcon aria-hidden="true" />
					{isLoggingOut ? "Signing out..." : "Sign out"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
