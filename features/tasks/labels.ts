import type { VariantProps } from "class-variance-authority";

import type { badgeVariants } from "@/components/ui/badge";

import type {
	AuditedColumn,
	TaskDepartment,
	TaskPriority,
	TaskStatus,
} from "./types";

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

/** Human sentence for the field a history entry changed. */
const auditColumnLabels: Record<AuditedColumn, string> = {
	title: "Title",
	description: "Description",
	assignedToId: "Assignee",
	status: "Status",
	priority: "Priority",
	department: "Department",
	clientVisible: "Client visibility",
	deletedAt: "Task deleted",
};

export function getAuditColumnLabel(column: AuditedColumn): string {
	return auditColumnLabels[column];
}

/**
 * Render a stored audit value.
 *
 * A stored value is a serialized column, so enum-like fields are translated
 * back to the wording the rest of the UI uses. `null` means the column was
 * empty, which is shown as an em dash rather than the string "null". An
 * unrecognised value falls back to the raw string: the trail is append-only, so
 * a value this build does not know about still has to render as something.
 */
export function getAuditValueLabel(
	column: AuditedColumn,
	value: string | null,
): string {
	if (value === null) {
		return "—";
	}
	switch (column) {
		case "status":
			return taskStatusConfig[value as TaskStatus]?.label ?? value;
		case "priority":
			return taskPriorityConfig[value as TaskPriority]?.label ?? value;
		case "department":
			return taskDepartmentConfig[value as TaskDepartment]?.label ?? value;
		case "clientVisible":
			return value === "true" ? "Visible" : "Hidden";
		default:
			return value;
	}
}
