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

/** The task fields a form submission can carry. */
export const TASK_FORM_FIELDS = [
	"title",
	"description",
	"assignedToId",
	"status",
	"priority",
	"department",
	"clientVisible",
] as const;

export type TaskFormField = (typeof TASK_FORM_FIELDS)[number];

/**
 * Only changed fields plus the row version are sent, so a partial edit can never
 * silently reset a field the user did not touch.
 *
 * `editableFields` is the set this viewer is allowed to change. Anything outside
 * it is dropped from the payload even if the form somehow produced a different
 * value, which is what keeps an internal user from submitting a description edit
 * the API would refuse. The backend still authorizes every field; this only
 * avoids a guaranteed 403.
 */
export function toUpdateTaskPayload(
	values: TaskFormValues,
	version: number,
	original: TaskFormValues,
	editableFields?: ReadonlySet<TaskFormField>,
): UpdateTaskPayload {
	const may = (field: TaskFormField): boolean =>
		editableFields === undefined || editableFields.has(field);
	const payload: UpdateTaskPayload = { version };
	const title = values.title.trim();
	const description = values.description.trim();
	const assignedToId = values.assignedToId?.trim() ?? "";

	if (may("title") && title !== original.title.trim()) {
		payload.title = title;
	}

	if (may("description") && description !== original.description.trim()) {
		payload.description = description;
	}

	if (
		may("assignedToId") &&
		assignedToId !== (original.assignedToId?.trim() ?? "")
	) {
		if (assignedToId.length > 0) {
			payload.assignedToId = assignedToId;
		} else {
			payload.assignedToId = undefined;
		}
	}

	if (may("status") && values.status !== original.status) {
		payload.status = values.status;
	}

	if (may("priority") && values.priority !== original.priority) {
		payload.priority = values.priority;
	}

	if (may("department") && values.department !== original.department) {
		payload.department = values.department;
	}

	if (may("clientVisible") && values.clientVisible !== original.clientVisible) {
		payload.clientVisible = values.clientVisible;
	}

	return payload;
}

/**
 * Whether the form holds anything worth submitting. Non-editable fields are
 * ignored, so a viewer who can only see a task is not blocked by a change they
 * were never allowed to make.
 */
export function hasTaskFormChanges(
	values: TaskFormValues,
	original: TaskFormValues,
	editableFields?: ReadonlySet<TaskFormField>,
): boolean {
	const may = (field: TaskFormField): boolean =>
		editableFields === undefined || editableFields.has(field);

	return (
		(may("title") && values.title.trim() !== original.title.trim()) ||
		(may("description") &&
			values.description.trim() !== original.description.trim()) ||
		(may("assignedToId") &&
			(values.assignedToId?.trim() ?? "") !==
				(original.assignedToId?.trim() ?? "")) ||
		(may("status") && values.status !== original.status) ||
		(may("priority") && values.priority !== original.priority) ||
		(may("department") && values.department !== original.department) ||
		(may("clientVisible") && values.clientVisible !== original.clientVisible)
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
