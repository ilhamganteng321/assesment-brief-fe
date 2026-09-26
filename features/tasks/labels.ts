import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";

import type { TaskDepartment, TaskPriority, TaskStatus } from "./types";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const taskStatusConfig: Record<
	TaskStatus,
	{ label: string; variant: BadgeVariant }
> = {
	TODO: { label: "To do", variant: "muted" },
	IN_PROGRESS: { label: "In progress", variant: "accent" },
	BLOCKED: { label: "Blocked", variant: "destructive" },
	DONE: { label: "Done", variant: "secondary" },
};

const taskPriorityConfig: Record<
	TaskPriority,
	{ label: string; variant: BadgeVariant }
> = {
	LOW: { label: "Low", variant: "muted" },
	MEDIUM: { label: "Medium", variant: "outline" },
	HIGH: { label: "High", variant: "accent" },
	URGENT: { label: "Urgent", variant: "destructive" },
};

const taskDepartmentConfig: Record<
	TaskDepartment,
	{ label: string; variant: BadgeVariant }
> = {
	PRODUCT: { label: "Product", variant: "outline" },
	UI_UX: { label: "UI/UX", variant: "outline" },
	FRONTEND: { label: "Frontend", variant: "outline" },
	BACKEND: { label: "Backend", variant: "outline" },
};

export function getTaskStatusLabel(status: TaskStatus): string {
	return taskStatusConfig[status].label;
}

export function getTaskStatusVariant(status: TaskStatus): BadgeVariant {
	return taskStatusConfig[status].variant;
}

export function getTaskPriorityLabel(priority: TaskPriority): string {
	return taskPriorityConfig[priority].label;
}

export function getTaskPriorityVariant(priority: TaskPriority): BadgeVariant {
	return taskPriorityConfig[priority].variant;
}

export function getTaskDepartmentLabel(department: TaskDepartment): string {
	return taskDepartmentConfig[department].label;
}

export function getTaskDepartmentVariant(
	department: TaskDepartment,
): BadgeVariant {
	return taskDepartmentConfig[department].variant;
}
