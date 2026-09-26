export const ORDER_RULES = ["asc", "desc"] as const;
export type OrderRule = (typeof ORDER_RULES)[number];

export type QueryFilters = Record<string, unknown>;

export type RangeFilter = {
	key: string;
	start: unknown;
	end: unknown;
};

/**
 * Official list query contract.
 *
 * These parameter names are fixed by the backend filtering contract and must not
 * be renamed (for example to `search`, `limit`, `pageSize`, `sort` or `sortBy`).
 */
export type ListQueryParams = {
	filters?: QueryFilters;
	searchFilters?: QueryFilters;
	rangedFilters?: RangeFilter[];
	page?: number;
	rows?: number;
	orderKey?: string;
	orderRule?: OrderRule;
};

export const LIST_QUERY_PARAM_NAMES = [
	"filters",
	"searchFilters",
	"rangedFilters",
	"page",
	"rows",
	"orderKey",
	"orderRule",
] as const;

export type ListQueryParamName = (typeof LIST_QUERY_PARAM_NAMES)[number];

export const DEFAULT_PAGE = 1;
export const DEFAULT_ROWS = 20;
export const ROWS_OPTIONS = [10, 20, 50, 100] as const;
