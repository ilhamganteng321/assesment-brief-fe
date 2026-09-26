import { describe, expect, test } from "bun:test";

import {
	loginSchema,
	registerFormSchema,
	registerRequestSchema,
} from "../features/auth/schemas";

function getIssuePaths(error) {
	return error.issues.map((issue) => issue.path.join("."));
}

describe("authentication schemas", () => {
	test("accepts and normalizes valid login data", () => {
		const result = loginSchema.parse({
			email: "  PM@AURORA.DEMO ",
			password: "valid-password",
		});

		expect(result.email).toBe("pm@aurora.demo");
	});

	test("rejects invalid login data", () => {
		const result = loginSchema.safeParse({ email: "invalid", password: "" });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(getIssuePaths(result.error)).toEqual(["email", "password"]);
		}
	});

	test("matches the backend registration contract", () => {
		const result = registerRequestSchema.parse({
			name: "Example User",
			email: "example@example.com",
			password: "password123",
			department: "BACKEND",
		});

		expect(result.department).toBe("BACKEND");
	});

	test("requires matching confirmation only in the form schema", () => {
		const request = registerRequestSchema.safeParse({
			name: "Example User",
			email: "example@example.com",
			password: "password123",
		});
		const form = registerFormSchema.safeParse({
			name: "Example User",
			email: "example@example.com",
			password: "password123",
			confirmPassword: "different",
		});

		expect(request.success).toBe(true);
		expect(form.success).toBe(false);
		if (!form.success) {
			expect(getIssuePaths(form.error)).toEqual(["confirmPassword"]);
		}
	});
});
