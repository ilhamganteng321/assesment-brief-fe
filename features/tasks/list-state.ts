import { z } from "zod";

import {
	DEFAULT_PAGE,
	DEFAULT_ROWS,
	type ListQueryParams,
	ORDER_RULES,
	type OrderRule,
} from "@/lib/api/query/types";

import {
	TASK_DEPARTMENTS,
	TASK_PRIORITIES,
	TASK_STATUSES,
	type TaskDepartment,
	type TaskPriority,
	type TaskStatus,
} from "./types";

export const TASK_ORDER_KEYS = [
	"createdAt",
	"updatedAt",
	"title",
	"status",
	"priority",
] as const;
export type TaskOrderKey = (typeof TASK_ORDER_KEYS)[number];

export const DEFAULT_TASK_ORDER_KEY: TaskOrderKey = "createdAt";
export const DEFAULT_TASK_ORDER_RULE: OrderRule = "desc";
export const DEFAULT_TASK_SEARCH_FIELD = "title";

export const TASK_VIEWS = ["list", "board"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export type TaskListState = {
	search: string;
	status: TaskStatus | "all";
	priority: TaskPriority | "all";
	department: TaskDepartment | "all";
	projectId: string;
	orderKey: TaskOrderKey;
	orderRule: OrderRule;
	page: number;
	rows: number;
	/** The list keeps search and paging; the board is the dependency view. */
	view: TaskView;
};

export const DEFAULT_TASK_LIST_STATE: TaskListState = {
	search: "",
	status: "all",
	priority: "all",
	department: "all",
	projectId: "",
	orderKey: DEFAULT_TASK_ORDER_KEY,
	orderRule: DEFAULT_TASK_ORDER_RULE,
	page: DEFAULT_PAGE,
	rows: DEFAULT_ROWS,
	view: "list",
};

const positiveIntSchema = z.coerce.number().int().positive();
const projectIdSchema = z.string().uuid();

function readPositiveInt(
	searchParams: URLSearchParams,
	name: string,
	fallback: number,
): number {
	const raw = searchParams.get(name);

	if (raw === null) {
		return fallback;
	}

	const result = positiveIntSchema.safeParse(raw);

	return result.success ? result.data : fallback;
}

function readEnum<T extends string>(
	searchParams: URLSearchParams,
	name: string,
	values: readonly T[],
	fallback: T | "all",
): T | "all" {
	const raw = searchParams.get(name);

	if (raw === null) {
		return fallback;
	}

	const result = z.enum(values).safeParse(raw);

	return result.success ? result.data : fallback;
}

/** The same parse, for a state field that has no "all" option. */
function readEnumValue<T extends string>(
	searchParams: URLSearchParams,
	name: string,
	values: readonly T[],
	fallback: T,
): T {
	const raw = searchParams.get(name);
	const result = z.enum(values).safeParse(raw);

	return result.success ? result.data : fallback;
}

function readOrderKey(searchParams: URLSearchParams): TaskOrderKey {
	const result = z
		.enum(TASK_ORDER_KEYS)
		.safeParse(searchParams.get("sort") ?? undefined);

	return result.success ? result.data : DEFAULT_TASK_ORDER_KEY;
}

function readOrderRule(searchParams: URLSearchParams): OrderRule {
	const result = z
		.enum(ORDER_RULES)
		.safeParse(searchParams.get("dir") ?? undefined);

	return result.success ? result.data : DEFAULT_TASK_ORDER_RULE;
}

function readProjectId(searchParams: URLSearchParams): string {
	const raw = searchParams.get("projectId");
	const result = projectIdSchema.safeParse(raw);

	return result.success ? result.data : "";
}

export function parseTaskListState(
	searchParams: URLSearchParams,
): TaskListState {
	return {
		search: searchParams.get("q")?.trim() ?? "",
		status: readEnum(searchParams, "status", TASK_STATUSES, "all"),
		priority: readEnum(searchParams, "priority", TASK_PRIORITIES, "all"),
		department: readEnum(searchParams, "department", TASK_DEPARTMENTS, "all"),
		projectId: readProjectId(searchParams),
		orderKey: readOrderKey(searchParams),
		orderRule: readOrderRule(searchParams),
		page: readPositiveInt(searchParams, "page", DEFAULT_PAGE),
		rows: readPositiveInt(searchParams, "rows", DEFAULT_ROWS),
		view: readEnumValue(searchParams, "view", TASK_VIEWS, "list"),
	};
}

export function serializeTaskListState(state: TaskListState): URLSearchParams {
	const searchParams = new URLSearchParams();
	const search = state.search.trim();

	if (search.length > 0) {
		searchParams.set("q", search);
	}

	if (state.status !== "all") {
		searchParams.set("status", state.status);
	}

	if (state.priority !== "all") {
		searchParams.set("priority", state.priority);
	}

	if (state.department !== "all") {
		searchParams.set("department", state.department);
	}

	if (state.projectId.length > 0) {
		searchParams.set("projectId", state.projectId);
	}

	if (state.orderKey !== DEFAULT_TASK_ORDER_KEY) {
		searchParams.set("sort", state.orderKey);
	}

	if (state.orderRule !== DEFAULT_TASK_ORDER_RULE) {
		searchParams.set("dir", state.orderRule);
	}

	if (state.page !== DEFAULT_PAGE) {
		searchParams.set("page", String(state.page));
	}

	if (state.rows !== DEFAULT_ROWS) {
		searchParams.set("rows", String(state.rows));
	}

	if (state.view !== "list") {
		searchParams.set("view", state.view);
	}

	return searchParams;
}

/**
 * Maps the view state onto the official list query contract. `projectId` is a
 * real filter rather than a client-side slice, so an internal user can never
 * page across a project they are not a member of.
 */
export function toTaskListQueryParams(state: TaskListState): ListQueryParams {
	const search = state.search.trim();
	const filters: Record<string, unknown> = {};

	if (state.status !== "all") {
		filters.status = state.status;
	}

	if (state.priority !== "all") {
		filters.priority = state.priority;
	}

	if (state.department !== "all") {
		filters.department = state.department;
	}

	if (state.projectId.length > 0) {
		filters.projectId = state.projectId;
	}

	return {
		filters,
		searchFilters:
			search.length > 0 ? { [DEFAULT_TASK_SEARCH_FIELD]: search } : undefined,
		page: state.page,
		rows: state.rows,
		orderKey: state.orderKey,
		orderRule: state.orderRule,
	};
}

export type TaskListCriteria = Partial<Omit<TaskListState, "page">>;

export function withTaskPageReset(
	state: TaskListState,
	criteria: TaskListCriteria,
): TaskListState {
	return { ...state, ...criteria, page: DEFAULT_PAGE };
}

export function withTaskPage(
	state: TaskListState,
	page: number,
): TaskListState {
	const result = positiveIntSchema.safeParse(page);

	return { ...state, page: result.success ? result.data : DEFAULT_PAGE };
}
