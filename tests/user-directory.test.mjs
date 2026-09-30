import { describe, expect, test } from "bun:test";
import { getRoleLabel } from "../features/auth/role-labels.ts";
import { USER_DEPARTMENTS, USER_ROLES } from "../features/auth/types.ts";
import {
	getVisibleNavItems,
	NAV_ITEMS,
} from "../features/navigation/config.ts";
import { getDepartmentLabel } from "../features/projects/labels.ts";
import { getInitials } from "../features/projects/member-display.ts";
import { getUserOrderKeyLabel } from "../features/users/labels.ts";
import {
	DEFAULT_USER_LIST_STATE,
	DEFAULT_USER_ORDER_KEY,
	DEFAULT_USER_ORDER_RULE,
	DEFAULT_USER_SEARCH_FIELD,
	hasUserCriteria,
	parseUserListState,
	serializeUserListState,
	USER_ORDER_KEYS,
	withUserPage,
	withUserPageReset,
} from "../features/users/list-state.ts";
import { canBrowseUserDirectory } from "../features/users/permissions.ts";

// ---------------------------------------------------------------------------
// The team directory, as the interface understands it.
//
// The permission cases mirror the backend matrix: a role that drifts here and
// there would put a page in front of somebody the API refuses, or hide one from
// a PM. The URL-state cases matter just as much — they are what makes a filtered
// view shareable and refreshable, and a bug there is silent.
// ---------------------------------------------------------------------------

const pm = { role: "PM" };
const internal = { role: "INTERNAL" };
const client = { role: "CLIENT" };
const anonymous = { role: undefined };

describe("user directory permissions", () => {
	// Mirrors `Permission.USER_READ`, granted to PM alone.
	test("only a project manager may browse the directory", () => {
		expect(canBrowseUserDirectory(pm)).toBe(true);
		expect(canBrowseUserDirectory(internal)).toBe(false);
		expect(canBrowseUserDirectory(client)).toBe(false);
		expect(canBrowseUserDirectory(anonymous)).toBe(false);
	});
});

describe("team navigation", () => {
	// The entry is hidden rather than disabled: a nav item that navigates
	// somewhere the API refuses is worse than one that is simply absent.
	test("Team is offered to a project manager only", () => {
		const hrefsFor = (role) =>
			getVisibleNavItems(role).map((item) => item.href);

		expect(hrefsFor("PM")).toContain("/team");
		expect(hrefsFor("INTERNAL")).not.toContain("/team");
		expect(hrefsFor("CLIENT")).not.toContain("/team");
	});

	test("the Team entry's declared roles match the policy", () => {
		const team = NAV_ITEMS.find((item) => item.href === "/team");

		expect(team).toBeDefined();
		for (const role of ["PM", "INTERNAL", "CLIENT"]) {
			expect(canBrowseUserDirectory({ role })).toBe(team.roles.includes(role));
		}
	});

	test("adding Team did not remove an existing destination", () => {
		for (const role of ["PM", "INTERNAL", "CLIENT"]) {
			const hrefs = getVisibleNavItems(role).map((item) => item.href);
			expect(hrefs).toContain("/projects");
			expect(hrefs).toContain("/settings");
		}
		// Tasks stays internal-only.
		expect(getVisibleNavItems("PM").map((item) => item.href)).toContain(
			"/tasks",
		);
		expect(getVisibleNavItems("CLIENT").map((item) => item.href)).not.toContain(
			"/tasks",
		);
	});
});

describe("user directory URL state", () => {
	test("defaults to an unfiltered first page", () => {
		const state = parseUserListState(new URLSearchParams());

		expect(state).toEqual(DEFAULT_USER_LIST_STATE);
		expect(state.search).toBe("");
		expect(state.role).toBe("all");
		expect(state.department).toBe("all");
		expect(state.page).toBe(1);
	});

	test("round-trips every filter through the URL", () => {
		const state = {
			search: "  john  ",
			role: "INTERNAL",
			department: "FRONTEND",
			orderKey: "name",
			orderRule: "desc",
			page: 3,
			rows: 50,
		};

		const query = serializeUserListState(state);
		const parsed = parseUserListState(query);

		// The search is trimmed on the way out, so the URL never carries padding.
		expect(parsed).toEqual({ ...state, search: "john" });
	});

	test("a shared link reproduces the view", () => {
		const query = new URLSearchParams(
			"q=ada&role=PM&department=BACKEND&sort=email&dir=asc&page=2&rows=10",
		);

		expect(parseUserListState(query)).toEqual({
			search: "ada",
			role: "PM",
			department: "BACKEND",
			orderKey: "email",
			orderRule: "asc",
			page: 2,
			rows: 10,
		});
	});

	// A default-heavy URL is unreadable, and it gets shared.
	test("defaults are omitted from the URL", () => {
		const query = serializeUserListState(DEFAULT_USER_LIST_STATE);

		expect(query.toString()).toBe("");
	});

	test("a hand-edited URL falls back rather than sending nonsense", () => {
		const state = parseUserListState(
			new URLSearchParams(
				"q=x&role=SUPERUSER&department=MARKETING&sort=passwordHash&dir=sideways&page=-1&rows=abc",
			),
		);

		expect(state.role).toBe("all");
		expect(state.department).toBe("all");
		expect(state.orderKey).toBe(DEFAULT_USER_ORDER_KEY);
		expect(state.orderRule).toBe(DEFAULT_USER_ORDER_RULE);
		expect(state.page).toBe(1);
		expect(state.rows).toBe(20);
		// A search is free text, so it survives whatever else is wrong.
		expect(state.search).toBe("x");
	});

	test("every order key round-trips", () => {
		for (const orderKey of USER_ORDER_KEYS) {
			const query = serializeUserListState({
				...DEFAULT_USER_LIST_STATE,
				orderKey,
			});
			expect(parseUserListState(query).orderKey).toBe(orderKey);
		}
	});

	test("every role and department round-trips", () => {
		for (const role of USER_ROLES) {
			const query = serializeUserListState({
				...DEFAULT_USER_LIST_STATE,
				role,
			});
			expect(parseUserListState(query).role).toBe(role);
		}
		for (const department of USER_DEPARTMENTS) {
			const query = serializeUserListState({
				...DEFAULT_USER_LIST_STATE,
				department,
			});
			expect(parseUserListState(query).department).toBe(department);
		}
	});

	// Narrowing a list while on page four otherwise shows an empty page, which
	// reads as "no results" rather than "these results, on the first page".
	test("changing a filter resets to the first page", () => {
		const state = withUserPageReset(
			{ ...DEFAULT_USER_LIST_STATE, page: 5 },
			{ role: "INTERNAL" },
		);

		expect(state.role).toBe("INTERNAL");
		expect(state.page).toBe(1);
	});

	test("changing the search resets to the first page", () => {
		const state = withUserPageReset(
			{ ...DEFAULT_USER_LIST_STATE, page: 4 },
			{ search: "john" },
		);

		expect(state.search).toBe("john");
		expect(state.page).toBe(1);
	});

	test("paging keeps the filters", () => {
		const filtered = {
			...DEFAULT_USER_LIST_STATE,
			role: "INTERNAL",
			search: "a",
		};

		expect(withUserPage(filtered, 3)).toEqual({ ...filtered, page: 3 });
	});

	test("an invalid page falls back rather than propagating", () => {
		expect(withUserPage(DEFAULT_USER_LIST_STATE, 0).page).toBe(1);
		expect(withUserPage(DEFAULT_USER_LIST_STATE, -2).page).toBe(1);
		expect(withUserPage(DEFAULT_USER_LIST_STATE, 1.5).page).toBe(1);
	});

	test("hasUserCriteria reports anything off the default", () => {
		expect(hasUserCriteria(DEFAULT_USER_LIST_STATE)).toBe(false);
		expect(hasUserCriteria({ ...DEFAULT_USER_LIST_STATE, search: "a" })).toBe(
			true,
		);
		expect(hasUserCriteria({ ...DEFAULT_USER_LIST_STATE, role: "PM" })).toBe(
			true,
		);
		expect(
			hasUserCriteria({ ...DEFAULT_USER_LIST_STATE, department: "BACKEND" }),
		).toBe(true);
		expect(
			hasUserCriteria({ ...DEFAULT_USER_LIST_STATE, orderKey: "name" }),
		).toBe(true);
		// Whitespace is not a criterion: it is not sent to the API either.
		expect(hasUserCriteria({ ...DEFAULT_USER_LIST_STATE, search: "   " })).toBe(
			false,
		);
	});

	test("the single search box sends its text under one field", () => {
		expect(DEFAULT_USER_SEARCH_FIELD).toBe("name");
	});
});

describe("user directory labels", () => {
	test("every order key has a human label", () => {
		for (const key of USER_ORDER_KEYS) {
			expect(getUserOrderKeyLabel(key).length).toBeGreaterThan(0);
		}
		// "Joined" is what a person calls the created-at column.
		expect(getUserOrderKeyLabel("createdAt")).toBe("Joined");
	});

	test("every role has a label", () => {
		for (const role of USER_ROLES) {
			expect(getRoleLabel(role).length).toBeGreaterThan(0);
		}
	});

	// Reused from the project labels rather than restated, so a department reads
	// the same wherever it appears.
	test("every department has a label, shared with the member list", () => {
		for (const department of USER_DEPARTMENTS) {
			expect(getDepartmentLabel(department).length).toBeGreaterThan(0);
		}
	});

	test("a person's monogram is derived from their name", () => {
		expect(getInitials("John Doe")).toBe("JD");
		expect(getInitials("Prince")).toBe("PR");
		expect(getInitials("   ")).toBe("?");
	});
});
