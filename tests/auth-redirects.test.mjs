import { describe, expect, test } from "bun:test";

import {
	getAuthPageHref,
	getLoginPath,
	getPostAuthPath,
	getSafeInternalPath,
} from "../features/auth/redirects";

describe("authentication redirects", () => {
	test("accepts internal application paths", () => {
		expect(getSafeInternalPath("/projects/123?view=board#details")).toBe(
			"/projects/123?view=board#details",
		);
	});

	test("rejects external, protocol-relative, and encoded redirects", () => {
		expect(getSafeInternalPath("https://malicious.example")).toBe("/dashboard");
		expect(getSafeInternalPath("//malicious.example")).toBe("/dashboard");
		expect(getSafeInternalPath("/\\malicious.example")).toBe("/dashboard");
		expect(getSafeInternalPath("/%2e%2e//evil.example")).toBe("/dashboard");
		expect(getSafeInternalPath("/%2F%2Fevil.example")).toBe("/dashboard");
		expect(getSafeInternalPath("/%252e%252e%252f%252fevil.example")).toBe(
			"/dashboard",
		);
	});

	test("does not redirect authenticated users back to auth pages", () => {
		expect(getPostAuthPath("/login")).toBe("/dashboard");
		expect(getPostAuthPath("/register/")).toBe("/dashboard");
		expect(getPostAuthPath("/login?reason=session-expired")).toBe("/dashboard");
	});

	test("preserves deep links when moving between auth pages", () => {
		expect(getAuthPageHref("register", "/projects/42?tab=notes")).toBe(
			"/register?redirect=%2Fprojects%2F42%3Ftab%3Dnotes",
		);
		expect(getLoginPath("/projects/42?tab=notes", true)).toBe(
			"/login?redirect=%2Fprojects%2F42%3Ftab%3Dnotes&reason=session-expired",
		);
	});
});
