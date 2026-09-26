import { describe, expect, test } from "bun:test";
import {
	getTaskDepartmentLabel,
	getTaskPriorityLabel,
	getTaskStatusLabel,
} from "../features/tasks/labels.ts";
import {
	DEFAULT_TASK_LIST_STATE,
	parseTaskListState,
	serializeTaskListState,
} from "../features/tasks/list-state.ts";
import {
	findAssigneeDepartmentConflict,
	hasTaskFormChanges,
	taskFormSchema,
	toCreateTaskPayload,
	toTaskFormValues,
	toUpdateTaskPayload,
} from "../features/tasks/schemas.ts";
import {
	TASK_DEPARTMENTS,
	TASK_PRIORITIES,
	TASK_STATUSES,
} from "../features/tasks/types.ts";

const validValues = {
	title: "  Ship the search endpoint  ",
	description: "  Add pagination.  ",
	assignedToId: "",
	status: "TODO",
	priority: "MEDIUM",
	department: "BACKEND",
	clientVisible: false,
};

describe("taskFormSchema", () => {
	test("accepts a trimmed valid form", () => {
		const result = taskFormSchema.safeParse(validValues);

		expect(result.success).toBe(true);
		expect(result.success && result.data).toEqual({
			title: "Ship the search endpoint",
			description: "Add pagination.",
			assignedToId: "",
			status: "TODO",
			priority: "MEDIUM",
			department: "BACKEND",
			clientVisible: false,
		});
	});

	test("rejects a blank title", () => {
		const result = taskFormSchema.safeParse({ ...validValues, title: "   " });

		expect(result.success).toBe(false);
	});

	test("rejects an unknown priority", () => {
		const result = taskFormSchema.safeParse({
			...validValues,
			priority: "CRITICAL",
		});

		expect(result.success).toBe(false);
	});

	test("rejects CLIENT as a task department", () => {
		const result = taskFormSchema.safeParse({
			...validValues,
			department: "CLIENT",
		});

		expect(result.success).toBe(false);
	});

	test("rejects a non-uuid assignee", () => {
		const result = taskFormSchema.safeParse({
			...validValues,
			assignedToId: "not-a-uuid",
		});

		expect(result.success).toBe(false);
	});
});

describe("toTaskFormValues", () => {
	test("falls back to safe defaults", () => {
		expect(toTaskFormValues()).toEqual({
			title: "",
			description: "",
			assignedToId: "",
			status: "TODO",
			priority: "MEDIUM",
			department: "PRODUCT",
			clientVisible: false,
		});
	});

	test("uses the supplied task values", () => {
		expect(
			toTaskFormValues({
				title: "Existing",
				description: "Body",
				assignedToId: "3f0a9d2c-6b1e-4a55-9f3d-2c7b5e1d9a04",
				status: "IN_PROGRESS",
				priority: "HIGH",
				department: "FRONTEND",
				clientVisible: true,
			}),
		).toEqual({
			title: "Existing",
			description: "Body",
			assignedToId: "3f0a9d2c-6b1e-4a55-9f3d-2c7b5e1d9a04",
			status: "IN_PROGRESS",
			priority: "HIGH",
			department: "FRONTEND",
			clientVisible: true,
		});
	});

	test("treats a null description as empty", () => {
		expect(toTaskFormValues({ description: null }).description).toBe("");
	});
});

describe("toCreateTaskPayload", () => {
	test("omits blank optional fields", () => {
		expect(toCreateTaskPayload(validValues, "project-1")).toEqual({
			projectId: "project-1",
			title: "Ship the search endpoint",
			status: "TODO",
			priority: "MEDIUM",
			department: "BACKEND",
			clientVisible: false,
			description: "Add pagination.",
		});
	});

	test("omits an empty description entirely", () => {
		const payload = toCreateTaskPayload(
			{ ...validValues, description: "   " },
			"project-1",
		);

		expect("description" in payload).toBe(false);
	});

	test("includes an assignee when one is chosen", () => {
		const payload = toCreateTaskPayload(
			{
				...validValues,
				assignedToId: "  3f0a9d2c-6b1e-4a55-9f3d-2c7b5e1d9a04  ",
			},
			"project-1",
		);

		expect(payload.assignedToId).toBe("3f0a9d2c-6b1e-4a55-9f3d-2c7b5e1d9a04");
	});
});

describe("toUpdateTaskPayload", () => {
	test("always sends the row version", () => {
		const payload = toUpdateTaskPayload(validValues, 4, validValues);

		expect(payload).toEqual({ version: 4 });
	});

	test("only sends changed fields", () => {
		const original = toTaskFormValues();
		const payload = toUpdateTaskPayload(
			{ ...original, status: "DONE", priority: "URGENT" },
			7,
			original,
		);

		expect(payload).toEqual({ version: 7, status: "DONE", priority: "URGENT" });
	});

	test("clears a description by sending an empty string", () => {
		const original = toTaskFormValues({ description: "Old body" });
		const payload = toUpdateTaskPayload(
			{ ...original, description: "  " },
			2,
			original,
		);

		expect(payload.description).toBe("");
	});

	test("ignores whitespace-only differences", () => {
		const original = toTaskFormValues({ title: "Task" });
		const payload = toUpdateTaskPayload(
			{ ...original, title: "  Task  " },
			1,
			original,
		);

		expect(payload).toEqual({ version: 1 });
	});
});

describe("hasTaskFormChanges", () => {
	test("detects no change for identical values", () => {
		const values = toTaskFormValues();

		expect(hasTaskFormChanges(values, { ...values })).toBe(false);
	});

	test("detects a priority change", () => {
		const original = toTaskFormValues();

		expect(
			hasTaskFormChanges({ ...original, priority: "HIGH" }, original),
		).toBe(true);
	});

	test("detects a department change", () => {
		const original = toTaskFormValues();

		expect(
			hasTaskFormChanges({ ...original, department: "UI_UX" }, original),
		).toBe(true);
	});
});

describe("findAssigneeDepartmentConflict", () => {
	const assigneeDepartments = new Map([
		["3f0a9d2c-6b1e-4a55-9f3d-2c7b5e1d9a04", "BACKEND"],
	]);

	test("accepts a matching assignee department", () => {
		expect(
			findAssigneeDepartmentConflict({
				assignedToId: "3f0a9d2c-6b1e-4a55-9f3d-2c7b5e1d9a04",
				department: "BACKEND",
				assigneeDepartments,
			}),
		).toBe(null);
	});

	test("rejects a mismatched assignee department", () => {
		expect(
			findAssigneeDepartmentConflict({
				assignedToId: "3f0a9d2c-6b1e-4a55-9f3d-2c7b5e1d9a04",
				department: "FRONTEND",
				assigneeDepartments,
			}),
		).toBe("department");
	});

	test("rejects an assignee who is not a project member", () => {
		expect(
			findAssigneeDepartmentConflict({
				assignedToId: "9d2b1a44-1111-2222-3333-444455556666",
				department: "BACKEND",
				assigneeDepartments,
			}),
		).toBe("assignee");
	});

	test("ignores an empty assignee", () => {
		expect(
			findAssigneeDepartmentConflict({
				assignedToId: "  ",
				department: "FRONTEND",
				assigneeDepartments,
			}),
		).toBe(null);
	});
});

describe("task list state", () => {
	test("parses an empty query string into defaults", () => {
		expect(parseTaskListState(new URLSearchParams())).toEqual(
			DEFAULT_TASK_LIST_STATE,
		);
	});

	test("round-trips a full state through the URL", () => {
		const state = {
			...DEFAULT_TASK_LIST_STATE,
			search: "search",
			status: "IN_PROGRESS",
			priority: "HIGH",
			department: "BACKEND",
			projectId: "3f0a9d2c-6b1e-4a55-9f3d-2c7b5e1d9a04",
			orderKey: "priority",
			orderRule: "asc",
			page: 3,
			rows: 50,
		};

		expect(parseTaskListState(serializeTaskListState(state))).toEqual(state);
	});

	test("ignores an unknown status and falls back", () => {
		const parsed = parseTaskListState(
			new URLSearchParams("status=NOT_A_STATUS"),
		);

		expect(parsed.status).toBe("all");
	});

	test("ignores a non-uuid projectId", () => {
		const parsed = parseTaskListState(new URLSearchParams("projectId=nope"));

		expect(parsed.projectId).toBe("");
	});

	test("ignores an out-of-range page", () => {
		const parsed = parseTaskListState(new URLSearchParams("page=0"));

		expect(parsed.page).toBe(1);
	});

	test("omits defaults from the serialized URL", () => {
		expect(serializeTaskListState(DEFAULT_TASK_LIST_STATE).toString()).toBe("");
	});
});

describe("task labels", () => {
	test("labels every status", () => {
		expect(TASK_STATUSES.map(getTaskStatusLabel)).toEqual([
			"To do",
			"Blocked",
			"In progress",
			"Done",
		]);
	});

	test("labels every priority", () => {
		expect(TASK_PRIORITIES.map(getTaskPriorityLabel)).toEqual([
			"Low",
			"Medium",
			"High",
			"Urgent",
		]);
	});

	test("labels every department", () => {
		expect(TASK_DEPARTMENTS.map(getTaskDepartmentLabel)).toEqual([
			"Product",
			"UI/UX",
			"Frontend",
			"Backend",
		]);
	});
});
