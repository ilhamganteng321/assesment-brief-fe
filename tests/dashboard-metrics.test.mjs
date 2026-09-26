import { describe, expect, test } from "bun:test";

import {
	buildMetricDrilldownHref,
	statusDrilldown,
	toMetricCards,
} from "../features/projects/components/metric-cards.ts";
import {
	DEFAULT_TASK_LIST_STATE,
	parseTaskListState,
	serializeTaskListState,
	toTaskListQueryParams,
} from "../features/tasks/list-state.ts";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

const counts = {
	total: 24,
	completed: 17,
	inProgress: 4,
	blocked: 2,
	todo: 1,
	loaded: true,
	canDrilldown: true,
};

describe("metric drilldown links", () => {
	// The link is a real URL, so the filtered board is shareable and survives a
	// refresh. A click handler flipping local state would do neither.
	test("a card link carries the project and the criteria in the query string", () => {
		const href = buildMetricDrilldownHref(PROJECT_ID, { status: "DONE" });

		expect(href.startsWith("/tasks?")).toBe(true);
		const query = new URLSearchParams(href.split("?")[1]);
		expect(query.get("projectId")).toBe(PROJECT_ID);
		expect(query.get("status")).toBe("DONE");
	});

	test("a drilldown always opens the list view, not the board columns", () => {
		const href = buildMetricDrilldownHref(PROJECT_ID, { view: "board" });
		const query = new URLSearchParams(href.split("?")[1]);

		// "list" is the default so it is omitted, but it must never be "board".
		expect(query.get("view")).not.toBe("board");
	});

	test("the blocked status uses the calculated filter, not a status", () => {
		// BLOCKED is a view column, not a status a client may set, so the card has
		// to filter on the server-calculated block state instead.
		expect(statusDrilldown("BLOCKED")).toEqual({
			blocked: "only",
			status: "all",
		});
		expect(statusDrilldown("DONE")).toEqual({ status: "DONE" });
	});

	test("a blocked drilldown produces a link the board understands", () => {
		const href = buildMetricDrilldownHref(
			PROJECT_ID,
			statusDrilldown("BLOCKED"),
		);
		const state = parseTaskListState(new URLSearchParams(href.split("?")[1]));

		expect(state.blocked).toBe("only");
		expect(state.status).toBe("all");
		expect(state.projectId).toBe(PROJECT_ID);
	});
});

describe("toMetricCards", () => {
	test("every count becomes a tile with the server's figure", () => {
		const cards = toMetricCards(counts);

		expect(cards.map((card) => [card.label, card.value])).toEqual([
			["Total tasks", 24],
			["Completed", 17],
			["In progress", 4],
			["Blocked", 2],
			["To do", 1],
		]);
	});

	test("each tile opens a filtered board", () => {
		const hrefs = toMetricCards(counts).map((card) => {
			expect(card.drilldown).not.toBeNull();
			return buildMetricDrilldownHref(PROJECT_ID, card.drilldown ?? {});
		});

		const blocked = new URLSearchParams(hrefs[3].split("?")[1] ?? "").get(
			"blocked",
		);
		expect(blocked).toBe("only");

		const done = new URLSearchParams(hrefs[1].split("?")[1] ?? "").get(
			"status",
		);
		expect(done).toBe("DONE");
	});

	// When drilling down is not possible the tile is a plain figure, and a link
	// would promise a filtered view that does not exist.
	test("a tile is not clickable when drilldown is unavailable", () => {
		const cards = toMetricCards({ ...counts, canDrilldown: false });

		expect(cards.every((card) => card.drilldown === null)).toBe(true);
	});

	test("the completed tile hints at its share of the total", () => {
		const completed = toMetricCards(counts).find(
			(card) => card.label === "Completed",
		);

		expect(completed?.hint).toBe("17 of 24");
	});

	test("no hint is offered when the project is empty", () => {
		const cards = toMetricCards({
			...counts,
			total: 0,
			completed: 0,
		});
		const completed = cards.find((card) => card.label === "Completed");

		expect(completed?.hint).toBeUndefined();
	});
});

describe("blocked filter in the list contract", () => {
	test("defaults to unrestricted", () => {
		expect(parseTaskListState(new URLSearchParams("")).blocked).toBe("any");
	});

	test("round-trips through the URL", () => {
		const state = { ...DEFAULT_TASK_LIST_STATE, blocked: "only" };
		const parsed = parseTaskListState(serializeTaskListState(state));

		expect(parsed.blocked).toBe("only");
	});

	test("ignores an unknown keyword", () => {
		expect(
			parseTaskListState(new URLSearchParams("blocked=maybe")).blocked,
		).toBe("any");
	});

	// The API takes a boolean, so the two keywords have to be translated rather
	// than forwarded as strings.
	test("maps the keywords onto the boolean filter", () => {
		const only = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			blocked: "only",
		});
		const clear = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			blocked: "clear",
		});
		const any = toTaskListQueryParams(DEFAULT_TASK_LIST_STATE);

		expect(only.filters).toEqual({ isBlocked: true });
		expect(clear.filters).toEqual({ isBlocked: false });
		expect(any.filters).toEqual({});
	});
});
