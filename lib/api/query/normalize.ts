import {
	DEFAULT_PAGE,
	DEFAULT_ROWS,
	type ListQueryParams,
	type OrderRule,
	type QueryFilters,
	type RangeFilter,
} from "./types";

export type NormalizedListQuery = {
	filters: QueryFilters | null;
	searchFilters: QueryFilters | null;
	rangedFilters: RangeFilter[] | null;
	page: number;
	rows: number;
	orderKey: string | null;
	orderRule: OrderRule | null;
};

function sortRecord(record: QueryFilters): QueryFilters {
	const sorted: QueryFilters = {};

	for (const key of Object.keys(record).sort()) {
		sorted[key] = record[key];
	}

	return sorted;
}

function sortRanges(ranges: RangeFilter[]): RangeFilter[] {
	return [...ranges]
		.map((range) => ({ ...range }))
		.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Produces a canonical, fully populated representation of the list query.
 *
 * TanStack Query keys must describe the complete normalized state, so
 * `undefined` and empty values are replaced by explicit `null` or defaults
 * instead of creating cache entries that differ only by omission.
 */
export function normalizeListQueryParams(
	params: ListQueryParams = {},
): NormalizedListQuery {
	const filters =
		params.filters && Object.keys(params.filters).length > 0
			? sortRecord(params.filters)
			: null;
	const searchFilters =
		params.searchFilters && Object.keys(params.searchFilters).length > 0
			? sortRecord(params.searchFilters)
			: null;
	const rangedFilters =
		params.rangedFilters && params.rangedFilters.length > 0
			? sortRanges(params.rangedFilters)
			: null;
	const orderKey =
		typeof params.orderKey === "string" && params.orderKey.trim().length > 0
			? params.orderKey.trim()
			: null;

	return {
		filters,
		searchFilters,
		rangedFilters,
		page: params.page ?? DEFAULT_PAGE,
		rows: params.rows ?? DEFAULT_ROWS,
		orderKey,
		orderRule: params.orderRule ?? null,
	};
}

export function listQueriesEqual(
	left: ListQueryParams = {},
	right: ListQueryParams = {},
): boolean {
	return (
		JSON.stringify(normalizeListQueryParams(left)) ===
		JSON.stringify(normalizeListQueryParams(right))
	);
}
