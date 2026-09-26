import { describe, expect, test } from "bun:test";

import { getVisibleNavItems } from "../features/navigation/config.ts";

describe("role based navigation", () => {
	// The internal task surface reads an API that refuses a client guest, so the
	// entry is withheld rather than left to fail on click.
	test("a client guest never sees the internal task entry", () => {
		const hrefs = getVisibleNavItems("CLIENT").map((item) => item.href);

		expect(hrefs).not.toContain("/tasks");
		expect(hrefs).toContain("/projects");
		expect(hrefs).toContain("/dashboard");
	});

	test("an internal user gets the task entry", () => {
		const hrefs = getVisibleNavItems("INTERNAL").map((item) => item.href);

		expect(hrefs).toContain("/tasks");
		expect(hrefs).toContain("/projects");
	});

	test("a PM gets the task entry", () => {
		expect(getVisibleNavItems("PM").map((item) => item.href)).toContain(
			"/tasks",
		);
	});

	test("every role keeps the dashboard and settings entries", () => {
		for (const role of ["PM", "INTERNAL", "CLIENT"]) {
			const hrefs = getVisibleNavItems(role).map((item) => item.href);
			expect(hrefs).toContain("/dashboard");
			expect(hrefs).toContain("/settings");
		}
	});
});
