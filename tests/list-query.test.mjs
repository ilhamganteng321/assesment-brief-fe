import { describe, expect, test } from "bun:test";
import {
	DEFAULT_PROJECT_LIST_STATE,
	parseProjectListState,
	serializeProjectListState,
	toListQueryParams,
	withPage,
	withPageReset,
} from "../features/projects/list-state";
import { normalizeListQueryParams } from "../lib/api/query/normalize";
import {
	buildQueryParams,
	buildQueryString,
	ListQueryError,
} from "../lib/api/query/serialize";

function parseJsonParam(search, name) {
	const raw = search.get(name);
	return raw === null ? null : JSON.parse(raw);
}

describe("buildQueryParams", () => {
	test("serializes filters as JSON", () => {
		const search = buildQueryParams({ filters: { status: "ACTIVE" } });

		expect(search.get("filters")).toBe('{"status":"ACTIVE"}');
	});

	test("serializes searchFilters as JSON", () => {
		const search = buildQueryParams({ searchFilters: { name: "Aurora" } });

		expect(search.get("searchFilters")).toBe('{"name":"Aurora"}');
	});

	test("serializes rangedFilters as a JSON array", () => {
		const search = buildQueryParams({
			rangedFilters: [{ key: "progress", start: 10, end: 90 }],
		});

		expect(parseJsonParam(search, "rangedFilters")).toEqual([
			{ key: "progress", start: 10, end: 90 },
		]);
	});

	test("serializes page and rows as numbers", () => {
		const search = buildQueryParams({ page: 2, rows: 50 });

		expect(search.get("page")).toBe("2");
		expect(search.get("rows")).toBe("50");
	});

	test("serializes orderKey and orderRule", () => {
		const search = buildQueryParams({ orderKey: "name", orderRule: "asc" });

		expect(search.get("orderKey")).toBe("name");
		expect(search.get("orderRule")).toBe("asc");
	});

	test("omits undefined values", () => {
		const search = buildQueryParams({
			filters: undefined,
			searchFilters: undefined,
			rangedFilters: undefined,
			page: undefined,
			rows: undefined,
			orderKey: undefined,
			orderRule: undefined,
		});

		expect(search.toString()).toBe("");
	});

	test("omits empty filter objects, arrays and strings", () => {
		const search = buildQueryParams({
			filters: { status: "", owner: "  " },
			searchFilters: { name: "" },
			rangedFilters: [],
		});

		expect(search.toString()).toBe("");
	});

	test("keeps nested filter objects and drops empty members of arrays", () => {
		const search = buildQueryParams({
			filters: { status: { in: ["ACTIVE", "ARCHIVED"] } },
			searchFilters: { name: ["Aurora", "", "  "] },
		});

		expect(parseJsonParam(search, "filters")).toEqual({
			status: { in: ["ACTIVE", "ARCHIVED"] },
		});
		expect(parseJsonParam(search, "searchFilters")).toEqual({
			name: ["Aurora"],
		});
	});

	test("omits a range with no start and no end", () => {
		const search = buildQueryParams({
			rangedFilters: [{ key: "progress", start: null, end: undefined }],
		});

		expect(search.toString()).toBe("");
	});

	test("keeps a one sided range", () => {
		const search = buildQueryParams({
			rangedFilters: [{ key: "progress", start: 10, end: undefined }],
		});

		expect(parseJsonParam(search, "rangedFilters")).toEqual([
			{ key: "progress", start: 10, end: undefined },
		]);
	});

	test("URL encodes every value", () => {
		const query = buildQueryString({
			filters: { status: "ACTIVE" },
			searchFilters: { name: "Aurora & Co/1" },
		});

		expect(query).toBe(
			"filters=%7B%22status%22%3A%22ACTIVE%22%7D&searchFilters=%7B%22name%22%3A%22Aurora+%26+Co%2F1%22%7D",
		);
		expect(query).not.toContain(" ");
	});

	test("round trips through URLSearchParams without losing values", () => {
		const query = buildQueryString({
			filters: { status: "ACTIVE" },
			searchFilters: { name: "Aurora" },
			rangedFilters: [{ key: "progress", start: 10, end: 90 }],
			page: 3,
			rows: 50,
			orderKey: "createdAt",
			orderRule: "desc",
		});

		const search = new URLSearchParams(query);

		expect(search.get("filters")).toBe('{"status":"ACTIVE"}');
		expect(search.get("searchFilters")).toBe('{"name":"Aurora"}');
		expect(search.get("page")).toBe("3");
		expect(search.get("rows")).toBe("50");
		expect(search.get("orderKey")).toBe("createdAt");
		expect(search.get("orderRule")).toBe("desc");
	});

	test("does not convert values unnecessarily", () => {
		const search = buildQueryParams({ searchFilters: { progress: 42 } });

		expect(search.get("searchFilters")).toBe('{"progress":42}');
	});

	test("emits parameters in a stable order", () => {
		const query = buildQueryString({
			orderRule: "asc",
			rows: 10,
			page: 1,
			orderKey: "name",
			searchFilters: { name: "Aurora" },
			filters: { status: "ACTIVE" },
		});

		expect(query.split("&").map((pair) => pair.split("=")[0])).toEqual([
			"filters",
			"searchFilters",
			"page",
			"rows",
			"orderKey",
			"orderRule",
		]);
	});

	test("rejects an invalid page", () => {
		expect(() => buildQueryParams({ page: 0 })).toThrow(ListQueryError);
		expect(() => buildQueryParams({ page: 1.5 })).toThrow(ListQueryError);
	});

	test("rejects an invalid rows value", () => {
		expect(() => buildQueryParams({ rows: -5 })).toThrow(ListQueryError);
	});

	test("rejects an invalid orderRule", () => {
		expect(() => buildQueryParams({ orderRule: "ascending" })).toThrow(
			ListQueryError,
		);
	});

	test("rejects an empty orderKey", () => {
		expect(() => buildQueryParams({ orderKey: "  " })).toThrow(ListQueryError);
	});

	test("rejects a non object filters value", () => {
		expect(() => buildQueryParams({ filters: [] })).toThrow(ListQueryError);
		expect(() => buildQueryParams({ rangedFilters: {} })).toThrow(
			ListQueryError,
		);
	});
});

describe("normalizeListQueryParams", () => {
	test("fills defaults and sorts filter keys", () => {
		expect(
			normalizeListQueryParams({
				filters: { status: "ACTIVE", clientId: "abc" },
			}),
		).toEqual({
			filters: { clientId: "abc", status: "ACTIVE" },
			searchFilters: null,
			rangedFilters: null,
			page: 1,
			rows: 20,
			orderKey: null,
			orderRule: null,
		});
	});

	test("treats omitted and empty query state as the same cache entry", () => {
		expect(normalizeListQueryParams()).toEqual(
			normalizeListQueryParams({ filters: {}, page: 1, rows: 20 }),
		);
	});

	test("keeps explicit ordering state", () => {
		const normalized = normalizeListQueryParams({
			page: 4,
			rows: 50,
			orderKey: "name",
			orderRule: "asc",
		});

		expect(normalized.page).toBe(4);
		expect(normalized.rows).toBe(50);
		expect(normalized.orderKey).toBe("name");
		expect(normalized.orderRule).toBe("asc");
	});
});

describe("project list state", () => {
	test("parses URL state", () => {
		const state = parseProjectListState(
			new URLSearchParams(
				"q=aurora&status=ACTIVE&sort=name&dir=asc&page=3&rows=50",
			),
		);

		expect(state).toEqual({
			search: "aurora",
			status: "ACTIVE",
			orderKey: "name",
			orderRule: "asc",
			page: 3,
			rows: 50,
		});
	});

	test("falls back to defaults for unknown or invalid URL state", () => {
		const state = parseProjectListState(
			new URLSearchParams(
				"sort=DROP+TABLE&dir=sideways&page=-2&rows=abc&status=NOPE",
			),
		);

		expect(state).toEqual(DEFAULT_PROJECT_LIST_STATE);
	});

	test("omits default values from the URL", () => {
		expect(
			serializeProjectListState(DEFAULT_PROJECT_LIST_STATE).toString(),
		).toBe("");
	});

	test("round trips non default URL state", () => {
		const state = {
			search: " aurora ",
			status: "ARCHIVED",
			orderKey: "name",
			orderRule: "asc",
			page: 2,
			rows: 50,
		};

		expect(parseProjectListState(serializeProjectListState(state))).toEqual({
			search: "aurora",
			status: "ARCHIVED",
			orderKey: "name",
			orderRule: "asc",
			page: 2,
			rows: 50,
		});
	});

	test("translates UI state into the official query contract", () => {
		const query = toListQueryParams({
			...DEFAULT_PROJECT_LIST_STATE,
			search: "aurora",
			status: "ACTIVE",
			page: 2,
		});

		expect(query.filters).toEqual({ status: "ACTIVE" });
		expect(query.searchFilters).toEqual({ name: "aurora" });
		expect(query.page).toBe(2);
		expect(query.rows).toBe(20);
		expect(query.orderKey).toBe("createdAt");
		expect(query.orderRule).toBe("desc");
	});

	test("leaves filter and search objects empty when unused", () => {
		const query = toListQueryParams(DEFAULT_PROJECT_LIST_STATE);

		expect(query.filters).toEqual({});
		expect(query.searchFilters).toBeUndefined();
	});

	test("resets the page when search, filters or rows change", () => {
		const state = { ...DEFAULT_PROJECT_LIST_STATE, page: 5 };

		expect(withPageReset(state, { search: "aurora" }).page).toBe(1);
		expect(withPageReset(state, { status: "ACTIVE" }).page).toBe(1);
		expect(withPageReset(state, { rows: 50 }).page).toBe(1);
		expect(withPageReset(state, { orderKey: "name" }).page).toBe(1);
	});

	test("preserves the rest of the state when only the page changes", () => {
		const state = { ...DEFAULT_PROJECT_LIST_STATE, search: "aurora" };
		const next = withPage(state, 4);

		expect(next.page).toBe(4);
		expect(next.search).toBe("aurora");
	});

	test("rejects an invalid page number", () => {
		expect(withPage(DEFAULT_PROJECT_LIST_STATE, 0).page).toBe(1);
	});
});
