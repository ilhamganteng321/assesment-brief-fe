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
	department: TaskDepartment;
};

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
	assignedToId?: string;
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
