import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";
import type { UserDepartment } from "@/features/auth/types";

import type { ProjectStatus, TaskStatus } from "./types";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const projectStatusConfig: Record<
	ProjectStatus,
	{ label: string; variant: BadgeVariant; description: string }
> = {
	PLANNING: {
		label: "Planning",
		variant: "outline",
		description: "Project is being planned and has not started yet.",
	},
	ACTIVE: {
		label: "Active",
		variant: "accent",
		description: "Project is currently in progress.",
	},
	COMPLETED: {
		label: "Completed",
		variant: "secondary",
		description: "Project has been marked as completed.",
	},
	ARCHIVED: {
		label: "Archived",
		variant: "muted",
		description: "Project is archived and read-only.",
	},
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

/**
 * What a status means, in the sentence shown beside the badge.
 *
 * The label alone says where a project is; this says what follows from it, which
 * is the part a reader actually needs — that an archived project is read-only
 * rather than merely a different colour.
 */
export function getProjectStatusDescription(status: ProjectStatus): string {
	return projectStatusConfig[status].description;
}

/**
 * The verb a lifecycle move uses, for button labels and dialog titles.
 *
 * Indexed by the status being moved *to*, because that is what the action does.
 */
const lifecycleActionLabels: Readonly<Record<ProjectStatus, string>> = {
	// A PLANNING project is started by moving it to ACTIVE, and a project is
	// ACTIVE before it can be completed, so both rows are the "start" verb. The
	// entry is indexed by the status being moved *to*, which is what makes them
	// the same label.
	PLANNING: "Start project",
	ACTIVE: "Start project",
	COMPLETED: "Mark as Completed",
	ARCHIVED: "Archive Project",
};

export function getLifecycleActionLabel(target: ProjectStatus): string {
	return lifecycleActionLabels[target];
}

export function getTaskStatusLabel(status: TaskStatus): string {
	return taskStatusConfig[status].label;
}

export function getTaskStatusVariant(status: TaskStatus): BadgeVariant {
	return taskStatusConfig[status].variant;
}

/**
 * How a department is written in the member list.
 *
 * The stored value is an enum member, which is a fine identifier but reads as
 * shouting to a person. `CLIENT` is spelled out in full rather than abbreviated,
 * because for a client account it says what the account *is* rather than which
 * team it sits in.
 */
const departmentLabels: Readonly<Record<UserDepartment, string>> = {
	PRODUCT: "Product",
	UI_UX: "UI/UX",
	FRONTEND: "Frontend",
	BACKEND: "Backend",
	CLIENT: "Client",
};

export function getDepartmentLabel(department: UserDepartment): string {
	return departmentLabels[department];
}
