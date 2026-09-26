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
 * A person's own department. This is the full set, so it also covers `CLIENT`
 * accounts; only `TASK_DEPARTMENTS` may own a task.
 */
export const USER_DEPARTMENTS = [
	"PRODUCT",
	"UI_UX",
	"FRONTEND",
	"BACKEND",
	"CLIENT",
] as const;
export type UserDepartment = (typeof USER_DEPARTMENTS)[number];

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

export type ProjectList = {
	projects: Project[];
	pagination: Pagination;
};

export type ProjectDetail = {
	project: Project;
};

export type ProjectMember = {
	id: string;
	projectId: string;
	userId: string;
	createdAt: string;
	user: {
		id: string;
		name: string;
		email: string;
		department: UserDepartment;
	};
};

export type ProjectMemberList = {
	members: ProjectMember[];
};

export type CreateProjectPayload = {
	name: string;
	description?: string;
	clientName?: string;
	status?: ProjectStatus;
};

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export type ClientProjectList = {
	projects: ClientProject[];
};

export type ClientTaskList = {
	tasks: ClientTask[];
	pagination: Pagination;
};
