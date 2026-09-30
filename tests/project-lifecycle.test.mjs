import { describe, expect, test } from "bun:test";
import {
	getLifecycleActionLabel,
	getProjectStatusDescription,
	getProjectStatusLabel,
} from "../features/projects/labels.ts";
import {
	canTransitionProjectStatus,
	getNextProjectStatuses,
	getTaskProgressSummary,
	isArchivedProject,
	isProjectReadOnly,
	PROJECT_STATUS_TRANSITIONS,
} from "../features/projects/lifecycle.ts";
import {
	canChangeProjectStatus,
	canDeleteProject,
	canEditProject,
	canEditProjectNow,
	getAvailableLifecycleActions,
} from "../features/projects/permissions.ts";
import {
	createProjectFormSchema,
	projectSettingsFormSchema,
	toCreateProjectPayload,
	toProjectSettingsPayload,
	toProjectSettingsValues,
} from "../features/projects/schemas.ts";
import { PROJECT_STATUSES } from "../features/projects/types.ts";

// ---------------------------------------------------------------------------
// The project lifecycle as the interface understands it.
//
// These mirror the server's rules, and the point of asserting them is the drift:
// if the backend's table changes and this one does not, a control appears that
// the API answers with 409. Every case here corresponds to a server test in
// `tests/lifecycle/project-lifecycle.integration.ts`.
// ---------------------------------------------------------------------------

const ALL = ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"];

const pm = { role: "PM" };
const internal = { role: "INTERNAL" };
const client = { role: "CLIENT" };
const anonymous = { role: undefined };

function projectWithStatus(status) {
	return {
		id: "3c9a1e8a-6d5b-4f21-9c3f-8f0d1a2b3c4d",
		name: "Aurora Retail Replatform",
		description: null,
		clientName: "Aurora Retail",
		status,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-02T00:00:00.000Z",
	};
}

describe("project lifecycle transitions", () => {
	test("the lifecycle only moves forward one step at a time", () => {
		expect(PROJECT_STATUS_TRANSITIONS.PLANNING).toEqual(["ACTIVE"]);
		expect(PROJECT_STATUS_TRANSITIONS.ACTIVE).toEqual(["COMPLETED"]);
		expect(PROJECT_STATUS_TRANSITIONS.COMPLETED).toEqual(["ARCHIVED"]);
	});

	test("an active project cannot be archived without being completed", () => {
		expect(canTransitionProjectStatus("ACTIVE", "ARCHIVED")).toBe(false);
	});

	test("a completed project cannot be reopened", () => {
		expect(canTransitionProjectStatus("COMPLETED", "ACTIVE")).toBe(false);
	});

	test("an archived project is terminal", () => {
		expect(getNextProjectStatuses("ARCHIVED")).toEqual([]);
		expect(canTransitionProjectStatus("ARCHIVED", "ACTIVE")).toBe(false);
		expect(canTransitionProjectStatus("ARCHIVED", "COMPLETED")).toBe(false);
	});

	// The exhaustive check is the one that catches drift: it fails if a status is
	// ever added to the enum without deciding where it sits.
	test("exactly the three forward steps are permitted", () => {
		const permitted = [];
		for (const from of ALL) {
			for (const to of ALL) {
				if (canTransitionProjectStatus(from, to)) {
					permitted.push(`${from}->${to}`);
				}
			}
		}
		expect(permitted).toEqual([
			"PLANNING->ACTIVE",
			"ACTIVE->COMPLETED",
			"COMPLETED->ARCHIVED",
		]);
	});

	test("only an archived project is read-only", () => {
		expect(isProjectReadOnly("ARCHIVED")).toBe(true);
		expect(isProjectReadOnly("COMPLETED")).toBe(false);
		expect(isProjectReadOnly("ACTIVE")).toBe(false);
		expect(isArchivedProject("ARCHIVED")).toBe(true);
	});
});

describe("project lifecycle permissions", () => {
	test("only a project manager may edit or delete a project", () => {
		expect(canEditProject(pm)).toBe(true);
		expect(canEditProject(internal)).toBe(false);
		expect(canEditProject(client)).toBe(false);
		expect(canEditProject(anonymous)).toBe(false);

		expect(canDeleteProject(pm)).toBe(true);
		expect(canDeleteProject(internal)).toBe(false);
		expect(canDeleteProject(client)).toBe(false);
	});

	// The lifecycle grants nobody a permission they did not already have, which
	// is what the server asserts for the same three roles.
	test("only a project manager may change a project's status", () => {
		expect(canChangeProjectStatus(pm)).toBe(true);
		expect(canChangeProjectStatus(internal)).toBe(false);
		expect(canChangeProjectStatus(client)).toBe(false);
		expect(canChangeProjectStatus(anonymous)).toBe(false);
	});

	test("a project manager is offered exactly the one next step", () => {
		expect(
			getAvailableLifecycleActions(pm, projectWithStatus("PLANNING")),
		).toEqual([{ targetStatus: "ACTIVE", label: "Start project" }]);

		expect(
			getAvailableLifecycleActions(pm, projectWithStatus("ACTIVE")),
		).toEqual([{ targetStatus: "COMPLETED", label: "Mark as Completed" }]);

		expect(
			getAvailableLifecycleActions(pm, projectWithStatus("COMPLETED")),
		).toEqual([{ targetStatus: "ARCHIVED", label: "Archive Project" }]);
	});

	// The label is indexed by the status being moved *to*, so the two moves that
	// both start the work read the same way.
	test("starting a project reads the same whichever status it starts from", () => {
		expect(
			getAvailableLifecycleActions(pm, projectWithStatus("PLANNING"))[0].label,
		).toBe("Start project");
	});

	// An archived project has nowhere to go. Offering anything here would imply
	// the product can reopen one, which it cannot.
	test("an archived project offers no lifecycle actions at all", () => {
		expect(
			getAvailableLifecycleActions(pm, projectWithStatus("ARCHIVED")),
		).toEqual([]);
	});

	// "You may not" is expressed as absence, not as a disabled control: a control
	// the API would refuse is worse than no control.
	test("an internal user and a client guest are offered nothing", () => {
		for (const status of ALL) {
			expect(
				getAvailableLifecycleActions(internal, projectWithStatus(status)),
			).toEqual([]);
			expect(
				getAvailableLifecycleActions(client, projectWithStatus(status)),
			).toEqual([]);
		}
	});

	test("an archived project is not editable even by a project manager", () => {
		expect(canEditProjectNow(pm, projectWithStatus("ARCHIVED"))).toBe(false);
		expect(canEditProjectNow(pm, projectWithStatus("COMPLETED"))).toBe(true);
		expect(canEditProjectNow(internal, projectWithStatus("ACTIVE"))).toBe(
			false,
		);
	});
});

describe("project status wording", () => {
	test("every status has a label, a description and an action verb", () => {
		for (const status of PROJECT_STATUSES) {
			expect(getProjectStatusLabel(status).length).toBeGreaterThan(0);
			expect(getProjectStatusDescription(status).length).toBeGreaterThan(0);
			expect(getLifecycleActionLabel(status).length).toBeGreaterThan(0);
		}
	});

	// The description is what tells a reader that an archived project is read-only
	// rather than merely a different shade, so it has to say so.
	test("the archived description states that the project is read-only", () => {
		expect(getProjectStatusDescription("ARCHIVED")).toContain("read-only");
	});

	test("the descriptions are distinct from one another", () => {
		const descriptions = ALL.map((status) =>
			getProjectStatusDescription(status),
		);
		expect(new Set(descriptions).size).toBe(ALL.length);
	});
});

describe("task progress summary", () => {
	test("reports the completed share in the form the confirmation uses", () => {
		expect(getTaskProgressSummary({ completed: 8, total: 10 })).toBe(
			"8 of 10 tasks completed",
		);
	});

	test("agrees with itself on the singular", () => {
		expect(getTaskProgressSummary({ completed: 1, total: 1 })).toBe(
			"1 of 1 task completed",
		);
	});

	// A figure the server has not supplied must not be invented, or the prompt
	// would claim a count nobody computed.
	test("is omitted entirely when the metrics have not loaded", () => {
		expect(getTaskProgressSummary({ completed: null, total: 10 })).toBeNull();
		expect(getTaskProgressSummary({ completed: 8, total: null })).toBeNull();
		expect(getTaskProgressSummary({ completed: null, total: null })).toBeNull();
	});

	test("reports zero for a project with no tasks", () => {
		expect(getTaskProgressSummary({ completed: 0, total: 0 })).toBe(
			"0 of 0 tasks completed",
		);
	});
});

describe("project settings form", () => {
	test("accepts a trimmed project with no optional fields", () => {
		const result = projectSettingsFormSchema.safeParse({
			name: "  Aurora Retail Replatform  ",
			description: "",
			clientName: "   ",
		});

		expect(result.success).toBe(true);
		expect(result.success && result.data).toEqual({
			name: "Aurora Retail Replatform",
			description: "",
			clientName: "",
		});
	});

	test("rejects a blank name", () => {
		expect(
			projectSettingsFormSchema.safeParse({
				name: "   ",
				description: "",
				clientName: "",
			}).success,
		).toBe(false);
	});

	test("rejects a name above the backend limit", () => {
		expect(
			projectSettingsFormSchema.safeParse({
				name: "a".repeat(151),
				description: "",
				clientName: "",
			}).success,
		).toBe(false);
	});

	// The status is absent by design: reaching ARCHIVED through a text field would
	// skip the confirmation the lifecycle depends on.
	test("carries no status field at all", () => {
		expect(Object.keys(projectSettingsFormSchema.shape).sort()).toEqual([
			"clientName",
			"description",
			"name",
		]);

		const result = projectSettingsFormSchema.safeParse({
			name: "Aurora",
			description: "",
			clientName: "",
			status: "ARCHIVED",
		});
		expect(result.success).toBe(true);
		expect(result.success && "status" in result.data).toBe(false);
	});

	test("the settings payload drops empty optional fields", () => {
		expect(
			toProjectSettingsPayload({
				name: "  Minimal  ",
				description: "",
				clientName: "   ",
			}),
		).toEqual({ name: "Minimal" });
	});

	test("the settings payload keeps the fields that were filled in", () => {
		expect(
			toProjectSettingsPayload({
				name: "Aurora",
				description: "  Rebuild the storefront.  ",
				clientName: "  Aurora Retail  ",
			}),
		).toEqual({
			name: "Aurora",
			description: "Rebuild the storefront.",
			clientName: "Aurora Retail",
		});
	});

	// Nulls become empty strings, not the string "null": an omitted value is the
	// form's own empty state.
	test("a project's null fields read as empty in the form", () => {
		expect(
			toProjectSettingsValues({
				name: "Aurora",
				description: null,
				clientName: null,
			}),
		).toEqual({ name: "Aurora", description: "", clientName: "" });
	});
});

describe("project create form", () => {
	test("accepts a starting status, which is a creation not a transition", () => {
		const result = createProjectFormSchema.safeParse({
			name: "Aurora",
			description: "",
			clientName: "",
			status: "PLANNING",
		});

		expect(result.success).toBe(true);
	});

	test("rejects an unknown status", () => {
		expect(
			createProjectFormSchema.safeParse({
				name: "Aurora",
				description: "",
				clientName: "",
				status: "PAUSED",
			}).success,
		).toBe(false);
	});

	test("every project status is a valid starting status", () => {
		for (const status of PROJECT_STATUSES) {
			expect(
				createProjectFormSchema.safeParse({
					name: "Aurora",
					description: "",
					clientName: "",
					status,
				}).success,
			).toBe(true);
		}
	});

	test("the create payload keeps the trimmed values", () => {
		expect(
			toCreateProjectPayload({
				name: "  Aurora Retail Replatform  ",
				description: "  Rebuild the storefront.  ",
				clientName: "  Aurora Retail  ",
				status: "PLANNING",
			}),
		).toEqual({
			name: "Aurora Retail Replatform",
			status: "PLANNING",
			description: "Rebuild the storefront.",
			clientName: "Aurora Retail",
		});
	});
});
