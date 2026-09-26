import { z } from "zod";

import {
	DEFAULT_PAGE,
	DEFAULT_ROWS,
	type ListQueryParams,
	ORDER_RULES,
	type OrderRule,
} from "@/lib/api/query/types";

import { PROJECT_STATUSES, type ProjectStatus } from "./types";

export const PROJECT_ORDER_KEYS = ["createdAt", "name", "status"] as const;
export type ProjectOrderKey = (typeof PROJECT_ORDER_KEYS)[number];

export const DEFAULT_PROJECT_ORDER_KEY: ProjectOrderKey = "createdAt";
export const DEFAULT_PROJECT_ORDER_RULE: OrderRule = "desc";
export const DEFAULT_PROJECT_SEARCH_FIELD = "name";

export type ProjectListState = {
	search: string;
	status: ProjectStatus | "all";
	orderKey: ProjectOrderKey;
	orderRule: OrderRule;
	page: number;
	rows: number;
};

export const DEFAULT_PROJECT_LIST_STATE: ProjectListState = {
	search: "",
	status: "all",
	orderKey: DEFAULT_PROJECT_ORDER_KEY,
	orderRule: DEFAULT_PROJECT_ORDER_RULE,
	page: DEFAULT_PAGE,
	rows: DEFAULT_ROWS,
};

const positiveIntSchema = z.coerce.number().int().positive();

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

function readStatus(searchParams: URLSearchParams): ProjectStatus | "all" {
	const raw = searchParams.get("status");

	if (raw === null) {
		return "all";
	}

	const result = z.enum(PROJECT_STATUSES).safeParse(raw);

	return result.success ? result.data : "all";
}

function readOrderKey(searchParams: URLSearchParams): ProjectOrderKey {
	const raw = searchParams.get("sort");
	const result = z.enum(PROJECT_ORDER_KEYS).safeParse(raw ?? undefined);

	return result.success ? result.data : DEFAULT_PROJECT_ORDER_KEY;
}

function readOrderRule(searchParams: URLSearchParams): OrderRule {
	const raw = searchParams.get("dir");
	const result = z.enum(ORDER_RULES).safeParse(raw ?? undefined);

	return result.success ? result.data : DEFAULT_PROJECT_ORDER_RULE;
}

export function parseProjectListState(
	searchParams: URLSearchParams,
): ProjectListState {
	return {
		search: searchParams.get("q")?.trim() ?? "",
		status: readStatus(searchParams),
		orderKey: readOrderKey(searchParams),
		orderRule: readOrderRule(searchParams),
		page: readPositiveInt(searchParams, "page", DEFAULT_PAGE),
		rows: readPositiveInt(searchParams, "rows", DEFAULT_ROWS),
	};
}

export function serializeProjectListState(
	state: ProjectListState,
): URLSearchParams {
	const searchParams = new URLSearchParams();
	const search = state.search.trim();

	if (search.length > 0) {
		searchParams.set("q", search);
	}

	if (state.status !== "all") {
		searchParams.set("status", state.status);
	}

	if (state.orderKey !== DEFAULT_PROJECT_ORDER_KEY) {
		searchParams.set("sort", state.orderKey);
	}

	if (state.orderRule !== DEFAULT_PROJECT_ORDER_RULE) {
		searchParams.set("dir", state.orderRule);
	}

	if (state.page !== DEFAULT_PAGE) {
		searchParams.set("page", String(state.page));
	}

	if (state.rows !== DEFAULT_ROWS) {
		searchParams.set("rows", String(state.rows));
	}

	return searchParams;
}

export function toListQueryParams(state: ProjectListState): ListQueryParams {
	const search = state.search.trim();
	const filters: Record<string, unknown> = {};

	if (state.status !== "all") {
		filters.status = state.status;
	}

	return {
		filters,
		searchFilters:
			search.length > 0
				? { [DEFAULT_PROJECT_SEARCH_FIELD]: search }
				: undefined,
		page: state.page,
		rows: state.rows,
		orderKey: state.orderKey,
		orderRule: state.orderRule,
	};
}

export type ProjectListCriteria = Partial<Omit<ProjectListState, "page">>;

export function withPageReset(
	state: ProjectListState,
	criteria: ProjectListCriteria,
): ProjectListState {
	return { ...state, ...criteria, page: DEFAULT_PAGE };
}

export function withPage(
	state: ProjectListState,
	page: number,
): ProjectListState {
	const result = positiveIntSchema.safeParse(page);

	return { ...state, page: result.success ? result.data : DEFAULT_PAGE };
}
