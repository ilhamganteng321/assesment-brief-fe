import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";

import type { ProjectStatus, TaskStatus } from "./types";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const projectStatusConfig: Record<
	ProjectStatus,
	{ label: string; variant: BadgeVariant }
> = {
	PLANNING: { label: "Planning", variant: "outline" },
	ACTIVE: { label: "Active", variant: "accent" },
	COMPLETED: { label: "Completed", variant: "secondary" },
	ARCHIVED: { label: "Archived", variant: "muted" },
};

const taskStatusConfig: Record<
	TaskStatus,
	{ label: string; variant: BadgeVariant }
> = {
	TODO: { label: "To do", variant: "muted" },
	IN_PROGRESS: { label: "In progress", variant: "accent" },
	BLOCKED: { label: "Blocked", variant: "destructive" },
	DONE: { label: "Done", variant: "secondary" },
};

export function getProjectStatusLabel(status: ProjectStatus): string {
	return projectStatusConfig[status].label;
}

export function getProjectStatusVariant(status: ProjectStatus): BadgeVariant {
	return projectStatusConfig[status].variant;
}

export function getTaskStatusLabel(status: TaskStatus): string {
	return taskStatusConfig[status].label;
}

export function getTaskStatusVariant(status: TaskStatus): BadgeVariant {
	return taskStatusConfig[status].variant;
}
