import { z } from "zod";

import {
	type CreateTaskPayload,
	TASK_DEPARTMENTS,
	TASK_PRIORITIES,
	TASK_STATUSES,
	type TaskDepartment,
	type TaskPriority,
	type TaskStatus,
	type UpdateTaskPayload,
} from "./types";

const titleSchema = z
	.string()
	.trim()
	.min(1, "Task title is required.")
	.max(200, "Task title must be at most 200 characters.");

const descriptionSchema = z
	.string()
	.trim()
	.max(5000, "Description must be at most 5000 characters.");

const assignedToIdSchema = z
	.string()
	.uuid("Select a valid assignee.")
	.optional()
	.or(z.literal(""));

const statusSchema = z.enum(TASK_STATUSES, {
	error: "Select a task status.",
});

const prioritySchema = z.enum(TASK_PRIORITIES, {
	error: "Select a task priority.",
});

const departmentSchema = z.enum(TASK_DEPARTMENTS, {
	error: "Select a responsible department.",
});

export const taskFormSchema = z.object({
	title: titleSchema,
	description: descriptionSchema,
	assignedToId: assignedToIdSchema,
	status: statusSchema,
	priority: prioritySchema,
	department: departmentSchema,
	clientVisible: z.boolean(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export type TaskFormDefaults = {
	title?: string;
	description?: string | null;
	assignedToId?: string | null;
	status?: TaskStatus;
	priority?: TaskPriority;
	department?: TaskDepartment;
	clientVisible?: boolean;
};

export function toTaskFormValues(
	defaults: TaskFormDefaults = {},
): TaskFormValues {
	return {
		title: defaults.title ?? "",
		description: defaults.description ?? "",
		assignedToId: defaults.assignedToId ?? "",
		status: defaults.status ?? "TODO",
		priority: defaults.priority ?? "MEDIUM",
		department: defaults.department ?? "PRODUCT",
		clientVisible: defaults.clientVisible ?? false,
	};
}

export function toCreateTaskPayload(
	values: TaskFormValues,
	projectId: string,
): CreateTaskPayload {
	const description = values.description.trim();
	const assignedToId = values.assignedToId?.trim() ?? "";

	return {
		projectId,
		title: values.title.trim(),
		status: values.status,
		priority: values.priority,
		department: values.department,
		clientVisible: values.clientVisible,
		...(description.length > 0 ? { description } : {}),
		...(assignedToId.length > 0 ? { assignedToId } : {}),
	};
}

/**
 * Only changed fields plus the row version are sent, so a partial edit can never
 * silently reset a field the user did not touch.
 */
export function toUpdateTaskPayload(
	values: TaskFormValues,
	version: number,
	original: TaskFormValues,
): UpdateTaskPayload {
	const payload: UpdateTaskPayload = { version };
	const title = values.title.trim();
	const description = values.description.trim();
	const assignedToId = values.assignedToId?.trim() ?? "";

	if (title !== original.title.trim()) {
		payload.title = title;
	}

	if (description !== original.description.trim()) {
		payload.description = description;
	}

	if (assignedToId !== (original.assignedToId?.trim() ?? "")) {
		if (assignedToId.length > 0) {
			payload.assignedToId = assignedToId;
		} else {
			payload.assignedToId = undefined;
		}
	}

	if (values.status !== original.status) {
		payload.status = values.status;
	}

	if (values.priority !== original.priority) {
		payload.priority = values.priority;
	}

	if (values.department !== original.department) {
		payload.department = values.department;
	}

	if (values.clientVisible !== original.clientVisible) {
		payload.clientVisible = values.clientVisible;
	}

	return payload;
}

export function hasTaskFormChanges(
	values: TaskFormValues,
	original: TaskFormValues,
): boolean {
	return (
		values.title.trim() !== original.title.trim() ||
		values.description.trim() !== original.description.trim() ||
		(values.assignedToId?.trim() ?? "") !==
			(original.assignedToId?.trim() ?? "") ||
		values.status !== original.status ||
		values.priority !== original.priority ||
		values.department !== original.department ||
		values.clientVisible !== original.clientVisible
	);
}

/**
 * The backend rejects an assignee whose department does not match the task's
 * department. Catching it here keeps the form from submitting a request that is
 * guaranteed to fail.
 */
export function findAssigneeDepartmentConflict(input: {
	assignedToId: string;
	department: TaskDepartment;
	assigneeDepartments: ReadonlyMap<string, TaskDepartment>;
}): "assignee" | "department" | null {
	const assignedToId = input.assignedToId.trim();

	if (assignedToId.length === 0) {
		return null;
	}

	const assigneeDepartment = input.assigneeDepartments.get(assignedToId);

	if (assigneeDepartment === undefined) {
		return "assignee";
	}

	return assigneeDepartment === input.department ? null : "department";
}
