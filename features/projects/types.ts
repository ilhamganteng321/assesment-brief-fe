import type { UserDepartment, UserRole } from "@/features/auth/types";

/**
 * Re-exported rather than restated, so there is exactly one definition of a
 * user's role and department in the codebase. A second copy of either union
 * would be free to drift from the one the server sends, and the drift would only
 * show up as an unexplained type error somewhere unrelated.
 */
export type { UserDepartment, UserRole };

export const PROJECT_STATUSES = [
	"PLANNING",
	"ACTIVE",
	"COMPLETED",
	"ARCHIVED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = [
	"TODO",
	"BLOCKED",
	"IN_PROGRESS",
	"DONE",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * A person's own department. The full set, so it also covers `CLIENT` accounts;
 * only `TASK_DEPARTMENTS` may own a task.
 */
export const USER_DEPARTMENTS = [
	"PRODUCT",
	"UI_UX",
	"FRONTEND",
	"BACKEND",
	"CLIENT",
] as const satisfies readonly UserDepartment[];

/** Departments that may own a task; the backend excludes `CLIENT`. */
export const TASK_DEPARTMENTS = [
	"PRODUCT",
	"UI_UX",
	"FRONTEND",
	"BACKEND",
] as const;
export type TaskDepartment = (typeof TASK_DEPARTMENTS)[number];

export type Project = {
	id: string;
	name: string;
	description: string | null;
	clientName: string | null;
	status: ProjectStatus;
	createdAt: string;
	updatedAt: string;
};

export type Pagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type ClientTaskMetrics = {
	total: number;
	completed: number;
	inProgress: number;
	todo: number;
	blocked: number;
};

export type ClientProject = {
	id: string;
	name: string;
	progress: {
		percentage: number;
	};
	tasks: ClientTaskMetrics;
};

export type ClientTask = {
	id: string;
	title: string;
	description: string | null;
	status: TaskStatus;
	clientVisible: boolean;
};

export type ClientTaskListQuery = {
	page?: number;
	limit?: number;
	search?: string;
	status?: TaskStatus;
};

/**
 * Task counts for one project, as the server computed them.
 *
 * `blocked` comes from the dependency graph rather than the stored `BLOCKED`
 * status, which is why it is a separate number from the others.
 */
export type ProjectTaskMetrics = {
	total: number;
	completed: number;
	inProgress: number;
	todo: number;
	blocked: number;
	/**
	 * Live tasks with nobody on them.
	 *
	 * A breakdown of `total` rather than of the open work, so it includes finished
	 * tasks and reconciles against the total. Computed by the server; the dashboard
	 * never tallies a list of tasks to work this out.
	 */
	unassigned: number;
};

export type ProjectMetrics = {
	projectId: string;
	progress: {
		percentage: number;
	};
	tasks: ProjectTaskMetrics;
	byDepartment: ProjectDepartmentMetrics[];
	/**
	 * Open work per person, busiest first, including a row for the unassigned tasks.
	 *
	 * Only members with at least one unfinished task appear — the server omits the
	 * rest rather than reporting zeroes, so this list cannot be used to enumerate a
	 * project's roster. Internal-only, like the rest of this payload.
	 */
	workload: ProjectWorkloadEntry[];
};

/**
 * One row of the workload split.
 *
 * `userId` is nullable because the unassigned bucket is a real row with a real
 * count; splitting it into its own field would mean rendering two lists of
 * different shapes.
 */
export type ProjectWorkloadEntry = {
	userId: string | null;
	name: string;
	department: TaskDepartment | null;
	openTaskCount: number;
};

export type ProjectDepartmentMetrics = {
	department: TaskDepartment;
	total: number;
	completed: number;
	inProgress: number;
	todo: number;
	blocked: number;
	/** Completed share for this department, computed by the server. */
	progressPercentage: number;
};

export type ProjectMetricsDetail = {
	metrics: ProjectMetrics;
};

/** One recent change in a project's history. */
export type ProjectActivityEntry = {
	id: string;
	taskId: string;
	taskTitle: string;
	userId: string;
	changedColumn: string;
	oldValue: string | null;
	newValue: string | null;
	createdAt: string;
};

export type ProjectActivityList = {
	activity: ProjectActivityEntry[];
	pagination: Pagination;
};

export type ProjectList = {
	projects: ProjectListItem[];
	pagination: Pagination;
};

/**
 * A row of the project list.
 *
 * The progress figure is computed by the server from the same aggregate the
 * project metrics endpoint uses, so the bar drawn in a list and the number shown
 * on the project it links to can never disagree. It is never totalled in the
 * browser from whichever page of tasks happened to load.
 */
export type ProjectListItem = Project & {
	progress: ProjectProgress;
};

export type ProjectProgress = {
	percentage: number;
};

export type ProjectDetail = {
	project: Project;
};

/**
 * The user fields the server exposes about a member.
 *
 * The backend selects these columns explicitly and never reads `passwordHash`,
 * so the shape is a guarantee rather than a hope about what the projection drops.
 * `role` is included deliberately: the global role is the only place the product
 * records what a member is allowed to do, so the interface has to show it.
 */
export type ProjectMemberUser = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	department: UserDepartment;
};

export type ProjectMember = {
	id: string;
	projectId: string;
	userId: string;
	createdAt: string;
	user: ProjectMemberUser;
};

export type ProjectMemberList = {
	members: ProjectMember[];
};

/**
 * A user who could be added to this project.
 *
 * `alreadyMember` is reported rather than filtered out server-side, so the
 * interface can say "already on this project" instead of leaving the caller to
 * wonder where somebody went. The add endpoint still refuses a duplicate
 * independently — this is a courtesy, not the rule.
 */
export type ProjectMemberCandidate = ProjectMemberUser & {
	alreadyMember: boolean;
};

export type ProjectMemberCandidates = {
	candidates: ProjectMemberCandidate[];
	pagination: Pagination;
};

/** The paging and search the candidate endpoint accepts. */
export type ProjectMemberCandidateQuery = {
	search: string;
	page?: number;
	rows?: number;
};

export type AddProjectMemberPayload = {
	userId: string;
};

export type CreateProjectPayload = {
	name: string;
	description?: string;
	clientName?: string;
	status?: ProjectStatus;
};

/**
 * A metadata edit.
 *
 * The lifecycle is deliberately absent: a project's position is moved through
 * `UpdateProjectStatusPayload`, so a rename can never double as a status change
 * and the confirmation dialog is the only way to reach the lifecycle.
 */
export type UpdateProjectPayload = {
	name?: string;
	description?: string;
	clientName?: string;
};

/** A single lifecycle move. The server validates the transition itself. */
export type UpdateProjectStatusPayload = {
	status: ProjectStatus;
};

export type ClientProjectList = {
	projects: ClientProject[];
};

export type ClientTaskList = {
	tasks: ClientTask[];
	pagination: Pagination;
};
