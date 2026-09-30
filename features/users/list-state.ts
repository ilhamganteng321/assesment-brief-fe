import { z } from "zod";

import { USER_DEPARTMENTS, USER_ROLES } from "@/features/auth/types";
import {
	DEFAULT_PAGE,
	DEFAULT_ROWS,
	type ListQueryParams,
	ORDER_RULES,
	type OrderRule,
} from "@/lib/api/query/types";

/**
 * The directory's list state, and its mapping to and from the URL.
 *
 * Every field a person can change lives in the query string rather than in
 * component state, so a directory view can be shared, bookmarked, and survived by
 * a refresh — the same convention the project and task lists already use. It also
 * means the back button undoes a filter, which is what a person expects after
 * narrowing a list.
 */

export const USER_ORDER_KEYS = [
	"name",
	"email",
	"role",
	"department",
	"createdAt",
] as const;
export type UserOrderKey = (typeof USER_ORDER_KEYS)[number];

export const DEFAULT_USER_ORDER_KEY: UserOrderKey = "createdAt";
export const DEFAULT_USER_ORDER_RULE: OrderRule = "asc";

/**
 * The search field the single search box sends its text under.
 *
 * The server treats a `name` search as matching a name *or* an address, so one box
 * covers both — someone is looked up by whichever of the two they remember. Named
 * here so the choice is visible rather than implied by a key in a filter object.
 */
export const DEFAULT_USER_SEARCH_FIELD = "name";

export type UserListState = {
	search: string;
	role: (typeof USER_ROLES)[number] | "all";
	department: (typeof USER_DEPARTMENTS)[number] | "all";
	orderKey: UserOrderKey;
	orderRule: OrderRule;
	page: number;
	rows: number;
};

export const DEFAULT_USER_LIST_STATE: UserListState = {
	search: "",
	role: "all",
	department: "all",
	orderKey: DEFAULT_USER_ORDER_KEY,
	orderRule: DEFAULT_USER_ORDER_RULE,
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

	// A hand-edited URL that says `?page=-1` or `?page=abc` falls back to the
	// default rather than sending something the API would reject, so a bad link
	// shows an empty first page instead of an error.
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

function readOrderKey(searchParams: URLSearchParams): UserOrderKey {
	const result = z
		.enum(USER_ORDER_KEYS)
		.safeParse(searchParams.get("sort") ?? undefined);

	return result.success ? result.data : DEFAULT_USER_ORDER_KEY;
}

function readOrderRule(searchParams: URLSearchParams): OrderRule {
	const result = z
		.enum(ORDER_RULES)
		.safeParse(searchParams.get("dir") ?? undefined);

	return result.success ? result.data : DEFAULT_USER_ORDER_RULE;
}

export function parseUserListState(
	searchParams: URLSearchParams,
): UserListState {
	return {
		search: searchParams.get("q")?.trim() ?? "",
		role: readEnum(searchParams, "role", USER_ROLES, "all"),
		department: readEnum(searchParams, "department", USER_DEPARTMENTS, "all"),
		orderKey: readOrderKey(searchParams),
		orderRule: readOrderRule(searchParams),
		page: readPositiveInt(searchParams, "page", DEFAULT_PAGE),
		rows: readPositiveInt(searchParams, "rows", DEFAULT_ROWS),
	};
}

/**
 * Serializes the state, omitting everything left at its default.
 *
 * A default-heavy URL is an unreadable one: `/team` is a page and
 * `/team?q=&role=all&department=all&sort=createdAt&dir=asc&page=1&rows=20` is a
 * confession. Only the differences from the default are written, so the common
 * case stays a clean link.
 */
export function serializeUserListState(state: UserListState): URLSearchParams {
	const searchParams = new URLSearchParams();
	const search = state.search.trim();

	if (search.length > 0) {
		searchParams.set("q", search);
	}
	if (state.role !== "all") {
		searchParams.set("role", state.role);
	}
	if (state.department !== "all") {
		searchParams.set("department", state.department);
	}
	if (state.orderKey !== DEFAULT_USER_ORDER_KEY) {
		searchParams.set("sort", state.orderKey);
	}
	if (state.orderRule !== DEFAULT_USER_ORDER_RULE) {
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

/**
 * Maps the view state onto the official list query contract.
 *
 * Both filters and the search are real server-side parameters, so the browser
 * never holds a list it filtered itself and the reported total is the number of
 * matches rather than the size of the page.
 */
export function toUserListQueryParams(state: UserListState): ListQueryParams {
	const search = state.search.trim();
	const filters: Record<string, unknown> = {};

	if (state.role !== "all") {
		filters.role = state.role;
	}
	if (state.department !== "all") {
		filters.department = state.department;
	}

	return {
		filters,
		searchFilters:
			search.length > 0 ? { [DEFAULT_USER_SEARCH_FIELD]: search } : undefined,
		page: state.page,
		rows: state.rows,
		orderKey: state.orderKey,
		orderRule: state.orderRule,
	};
}

export type UserListCriteria = Partial<Omit<UserListState, "page">>;

/**
 * Every filter change resets to the first page.
 *
 * Narrowing a list while sitting on page four otherwise shows an empty page and
 * reads as "no results", which is a different answer from "these results, on the
 * first page".
 */
export function withUserPageReset(
	state: UserListState,
	criteria: UserListCriteria,
): UserListState {
	return { ...state, ...criteria, page: DEFAULT_PAGE };
}

export function withUserPage(
	state: UserListState,
	page: number,
): UserListState {
	const result = positiveIntSchema.safeParse(page);
	return { ...state, page: result.success ? result.data : DEFAULT_PAGE };
}

/**
 * Whether the state is anything other than the default.
 *
 * Drives the "clear filters" affordance, so it is worth one definition rather
 * than the same comparison written out in a component.
 */
export function hasUserCriteria(state: UserListState): boolean {
	return (
		state.search.trim().length > 0 ||
		state.role !== "all" ||
		state.department !== "all" ||
		state.orderKey !== DEFAULT_USER_ORDER_KEY ||
		state.orderRule !== DEFAULT_USER_ORDER_RULE ||
		state.rows !== DEFAULT_ROWS
	);
}
