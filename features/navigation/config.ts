import type { Icon } from "@phosphor-icons/react";
import {
	CheckSquareIcon,
	FolderIcon,
	GearSixIcon,
	KanbanIcon,
	SquaresFourIcon,
	UsersIcon,
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
		// A personal view of the same data, not a separate role or permission: every
		// internal user has work of their own, and the entry is offered to exactly
		// the roles the flat task list already is.
		href: "/tasks/my",
		label: "My Tasks",
		description: "What is assigned to you",
		roles: ["PM", "INTERNAL"],
		icon: CheckSquareIcon,
	},
	{
		// The directory is the organisation's account list, so it is offered only
		// to the role the backend grants `USER_READ` to. The entry is hidden from
		// an internal user and a client guest rather than disabled: a nav item that
		// navigates nowhere is noise, and the API would refuse it regardless.
		href: "/team",
		label: "Team",
		description: "Find the people you work with",
		roles: ["PM"],
		icon: UsersIcon,
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

/**
 * Whether a nav item is the active one for a pathname.
 *
 * `/tasks` must not light up for `/tasks/my`: it is a prefix of it, and the naive
 * `startsWith` would leave both marked at once on the personal page. The test is
 * whether a *more specific* entry also covers this path — the deeper entry wins,
 * because a reader standing on My Tasks should have exactly one current item.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
	if (pathname === href) {
		return true;
	}

	if (!pathname.startsWith(`${href}/`)) {
		return false;
	}

	// A parent whose child is also a nav entry does not claim the child. Both are
	// in the sidebar, so highlighting the pair would leave the reader with two
	// "current" items and no way to tell which page they are on. The question is
	// whether some *other* entry covers this path more specifically — not whether
	// this entry is nested, which is true on both sides of the pair.
	return !NAV_ITEMS.some(
		(item) =>
			item.href !== href &&
			(pathname === item.href || pathname.startsWith(`${item.href}/`)),
	);
}
