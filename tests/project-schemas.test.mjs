import { describe, expect, test } from "bun:test";
import { getProjectStatusLabel } from "../features/projects/labels.ts";
import {
	createProjectFormSchema,
	toCreateProjectPayload,
	toUpdateProjectPayload,
} from "../features/projects/schemas.ts";
import { PROJECT_STATUSES } from "../features/projects/types.ts";

const validValues = {
	name: "  Aurora Retail Replatform  ",
	description: "  Rebuild the storefront.  ",
	clientName: "  Aurora Retail  ",
	status: "PLANNING",
};

describe("createProjectFormSchema", () => {
	test("accepts a trimmed valid form", () => {
		const result = createProjectFormSchema.safeParse(validValues);

		expect(result.success).toBe(true);
		expect(result.success && result.data).toEqual({
			name: "Aurora Retail Replatform",
			description: "Rebuild the storefront.",
			clientName: "Aurora Retail",
			status: "PLANNING",
		});
	});

	test("accepts empty optional fields", () => {
		const result = createProjectFormSchema.safeParse({
			name: "Minimal",
			description: "",
			clientName: "",
			status: "ACTIVE",
		});

		expect(result.success).toBe(true);
	});

	test("rejects a blank name", () => {
		const result = createProjectFormSchema.safeParse({
			...validValues,
			name: "   ",
		});

		expect(result.success).toBe(false);
	});

	test("rejects a name above the backend limit", () => {
		const result = createProjectFormSchema.safeParse({
			...validValues,
			name: "a".repeat(151),
		});

		expect(result.success).toBe(false);
	});

	test("rejects an unknown status", () => {
		const result = createProjectFormSchema.safeParse({
			...validValues,
			status: "PAUSED",
		});

		expect(result.success).toBe(false);
	});

	test("rejects an over-long description", () => {
		const result = createProjectFormSchema.safeParse({
			...validValues,
			description: "a".repeat(5001),
		});

		expect(result.success).toBe(false);
	});

	test("accepts every project status", () => {
		for (const status of PROJECT_STATUSES) {
			const result = createProjectFormSchema.safeParse({
				...validValues,
				status,
			});

			expect(result.success).toBe(true);
		}
	});
});

describe("project form payload mapping", () => {
	test("drops empty optional fields and keeps the trimmed name", () => {
		expect(
			toCreateProjectPayload({
				name: "  Minimal  ",
				description: "",
				clientName: "   ",
				status: "ACTIVE",
			}),
		).toEqual({ name: "Minimal", status: "ACTIVE" });
	});

	test("keeps provided optional fields", () => {
		expect(toCreateProjectPayload(validValues)).toEqual({
			name: "Aurora Retail Replatform",
			status: "PLANNING",
			description: "Rebuild the storefront.",
			clientName: "Aurora Retail",
		});
	});

	test("update payload mirrors the create mapping", () => {
		expect(toUpdateProjectPayload(validValues)).toEqual(
			toCreateProjectPayload(validValues),
		);
	});
});

describe("project status labels", () => {
	test("exposes a label for every status", () => {
		for (const status of PROJECT_STATUSES) {
			expect(getProjectStatusLabel(status).length).toBeGreaterThan(0);
		}
	});

	test("labels planning explicitly", () => {
		expect(getProjectStatusLabel("PLANNING")).toBe("Planning");
	});
});
