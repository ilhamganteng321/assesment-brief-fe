import type { Icon } from "@phosphor-icons/react";
import {
	FolderIcon,
	GearSixIcon,
	KanbanIcon,
	SquaresFourIcon,
} from "@phosphor-icons/react";

import type { UserRole } from "@/features/auth/types";
import { APP_NAME } from "@/lib/app-config";

export { APP_NAME };

export type NavItem = {
	href: string;
	label: string;
	description: string;
	roles: readonly UserRole[];
	icon: Icon;
};

export const NAV_ITEMS = [
	{
		href: "/dashboard",
		label: "Dashboard",
		description: "Overview of your work",
		roles: ["PM", "INTERNAL", "CLIENT"],
		icon: SquaresFourIcon,
	},
	{
		href: "/projects",
		label: "Projects",
		description: "Browse your projects",
		roles: ["PM", "INTERNAL", "CLIENT"],
		icon: FolderIcon,
	},
	{
		// The flat task API is internal-only, so clients never see this entry.
		href: "/tasks",
		label: "Tasks",
		description: "Work across your projects",
		roles: ["PM", "INTERNAL"],
		icon: KanbanIcon,
	},
	{
		href: "/settings",
		label: "Settings",
		description: "Your account details",
		roles: ["PM", "INTERNAL", "CLIENT"],
		icon: GearSixIcon,
	},
] as const satisfies readonly NavItem[];

export function getVisibleNavItems(role: UserRole): NavItem[] {
	// `as const` narrows each entry's roles to its own literal tuple, so the
	// widened `NavItem` shape is what a role lookup has to go through.
	return NAV_ITEMS.filter((item) =>
		(item.roles as readonly UserRole[]).includes(role),
	);
}

export function isNavItemActive(pathname: string, href: string): boolean {
	if (pathname === href) {
		return true;
	}

	return pathname.startsWith(`${href}/`);
}
