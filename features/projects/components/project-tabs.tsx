"use client";

import type { Icon } from "@phosphor-icons/react";
import {
	ClockCounterClockwiseIcon,
	GearSixIcon,
	KanbanIcon,
	SquaresFourIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The sections of one project.
 *
 * The sections that live on this page are reached by anchor, and Settings is a
 * real link to its own route. The mix is deliberate: settings is a separate URL
 * so a project manager can bookmark it, share it and survive a refresh, which an
 * in-page anchor cannot offer, while the rest of the page is one continuous
 * document that scrolling through is the natural way to read. Keeping them in a
 * single strip means the two kinds of destination do not read as two different
 * navigations.
 *
 * This is a real `nav` with `aria-current` on the entry that is showing, so a
 * screen reader announces which section is open rather than leaving the reader to
 * infer it from the page contents. A pending entry is a span rather than a link,
 * so it is not focusable and cannot be activated into nothing.
 */
type ProjectTab = {
	id: string;
	label: string;
	href: string;
	icon: Icon;
	/** Set when the section is not built yet; renders the entry inert. */
	pending?: string;
};

/** The entry the tab strip should mark as showing. */
export type ProjectSection = "overview" | "settings";

export function ProjectTabs({
	projectId,
	activeSection,
	className,
}: {
	projectId: string;
	/** The section currently on screen. */
	activeSection: ProjectSection;
	className?: string;
}) {
	const pathname = usePathname();
	const base = `/projects/${projectId}`;

	const tabs: ProjectTab[] = [
		{ id: "overview", label: "Overview", href: base, icon: SquaresFourIcon },
		{
			id: "tasks",
			label: "Tasks",
			href: `${base}#project-tasks`,
			icon: KanbanIcon,
		},
		{
			id: "members",
			label: "Members",
			href: `${base}#project-members`,
			icon: UsersIcon,
		},
		{
			id: "activity",
			label: "Activity",
			href: `${base}#project-activity`,
			icon: ClockCounterClockwiseIcon,
		},
		{
			id: "settings",
			label: "Settings",
			href: `${base}/settings`,
			icon: GearSixIcon,
		},
	];

	return (
		<nav aria-label="Project sections" className={cn("border-b", className)}>
			<ul className="flex flex-wrap items-center gap-1">
				{tabs.map((tab) => {
					const isActive =
						tab.id === activeSection ||
						(tab.id === "settings" && pathname === `${base}/settings`);
					const entryClass = cn(
						"inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
						isActive
							? "bg-muted text-foreground"
							: "text-muted-foreground hover:text-foreground",
						tab.pending !== undefined &&
							"cursor-not-allowed opacity-60 hover:text-muted-foreground",
					);

					return (
						<li key={tab.id}>
							{tab.pending !== undefined ? (
								<span
									aria-disabled="true"
									className={entryClass}
									title={tab.pending}
								>
									<tab.icon aria-hidden="true" />
									{tab.label}
									<span className="text-xs text-muted-foreground">Soon</span>
								</span>
							) : (
								<Link
									aria-current={isActive ? "page" : undefined}
									className={entryClass}
									href={tab.href}
								>
									<tab.icon aria-hidden="true" />
									{tab.label}
								</Link>
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
