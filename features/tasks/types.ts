import type { UserRole } from "@/features/auth/types";

/**
 * Re-exported rather than restated, so there is exactly one definition of a user's
 * role in the codebase — the same reasoning as `features/projects/types.ts`.
 */
export type { UserRole };

export const TASK_STATUSES = [
	"TODO",
	"BLOCKED",
	"IN_PROGRESS",
	"DONE",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * Departments that may own a task. `CLIENT` is intentionally absent: it
 * describes an account type, never a delivery team.
 */
export const TASK_DEPARTMENTS = [
	"PRODUCT",
	"UI_UX",
	"FRONTEND",
	"BACKEND",
] as const;
export type TaskDepartment = (typeof TASK_DEPARTMENTS)[number];

export const PROJECT_STATUSES = [
	"PLANNING",
	"ACTIVE",
	"COMPLETED",
	"ARCHIVED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * A prerequisite exactly as the server returns it. `deleted` is always present
 * for internal callers so a soft deleted prerequisite can be recognised and
 * explained instead of silently disappearing from the graph.
 */
export type TaskDependency = {
	id: string;
	title: string;
	status: TaskStatus;
	deleted: boolean;
};

/** The blocking prerequisites named on a task itself. */
export type BlockedTaskInformation = TaskDependency;

export type TaskDependencyResponse = {
	dependencies: TaskDependency[];
};

export type CreateTaskDependencyInput = {
	dependencyTaskId: string;
};

export type Task = {
	id: string;
	projectId: string;
	assignedToId: string | null;
	/**
	 * The assignee's display fields, resolved server-side, or null.
	 *
	 * A display copy of `assignedToId` rather than a second source of truth: the id
	 * stays authoritative and this is only there so a list can render a name without
	 * a request per row.
	 */
	assignedTo: TaskAssignee | null;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	department: TaskDepartment;
	clientVisible: boolean;
	version: number;
	createdAt: string;
	updatedAt: string;
	isBlocked: boolean;
	blockedBy: BlockedTaskInformation[];
};

export type TaskProjectSummary = {
	id: string;
	name: string;
	status: ProjectStatus;
};

export type TaskAssigneeSummary = {
	id: string;
	name: string;
	email: string;
	/**
	 * The person's global role. Shown next to their name in the assignee control
	 * because it is what they will be able to do with the task once they have it,
	 * and it is the same field the member list already carries.
	 */
	role: UserRole;
	department: TaskDepartment;
};

/**
 * Who is on a task, as the server resolved it.
 *
 * Present on the list as well as the detail so a table row can name the person
 * without the browser issuing a request per task. `null` on an unassigned task, and
 * there is no way for it to be anything else — the server builds it field by field
 * and never includes anything beyond these five.
 */
export type TaskAssignee = TaskAssigneeSummary;

export type TaskDetail = Task & {
	project: TaskProjectSummary;
	assignedTo: TaskAssigneeSummary | null;
};

export type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type TaskList = {
	tasks: Task[];
	pagination: Pagination;
};

export type CreateTaskPayload = {
	projectId: string;
	title: string;
	description?: string;
	assignedToId?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	department?: TaskDepartment;
	clientVisible?: boolean;
};

export type UpdateTaskPayload = {
	title?: string;
	description?: string;
	/**
	 * A uuid reassigns the task, `null` clears it, and omitting the field leaves it
	 * alone. The three states are distinct on the wire, which is why `null` is in
	 * the type rather than being collapsed into `undefined`: `undefined` means "do
	 * not touch", and a payload cannot express "take it off" without a second
	 * spelling.
	 */
	assignedToId?: string | null;
	status?: TaskStatus;
	priority?: TaskPriority;
	department?: TaskDepartment;
	clientVisible?: boolean;
	version: number;
};

/**
 * The auditable columns. Mirrors the server allow-list, so the UI can never
 * render a label for a field the API would not record.
 */
export const AUDITED_COLUMNS = [
	"title",
	"description",
	"assignedToId",
	"status",
	"priority",
	"department",
	"clientVisible",
	"deletedAt",
] as const;

export type AuditedColumn = (typeof AUDITED_COLUMNS)[number];

/**
 * One immutable change record. `oldValue` and `newValue` are the serialized
 * column values; `null` means the column was or became empty, never the string
 * "null".
 */
export type TaskAuditLog = {
	id: string;
	taskId: string;
	userId: string;
	changedColumn: AuditedColumn;
	oldValue: string | null;
	newValue: string | null;
	createdAt: string;
};

export type TaskAuditLogList = {
	auditLogs: TaskAuditLog[];
	pagination: Pagination;
};

/** The two options the audit endpoint accepts; nothing else is sent. */
export type TaskAuditLogQuery = {
	page?: number;
	limit?: number;
	changedColumn?: AuditedColumn;
};
