import { describe, expect, test } from "bun:test";
import {
	getAuditColumnLabel,
	getAuditValueLabel,
	getTaskDepartmentLabel,
	getTaskPriorityLabel,
	getTaskStatusLabel,
} from "../features/tasks/labels.ts";
import {
	DEFAULT_TASK_LIST_STATE,
	parseTaskListState,
	serializeTaskListState,
	toTaskListQueryParams,
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
	AUDITED_COLUMNS,
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

	// A rejected conflict refetches the row, so the retry is built from the newer
	// server state. The version has to come from that row, and the fields the
	// other user changed must stay out of the payload -- resending them from a
	// stale form is exactly the lost update the server rejected.
	test("a retry after a conflict targets the new version and drops the other user's fields", () => {
		const reloaded = toTaskFormValues({
			description: "Create responsive landing page",
			status: "IN_PROGRESS",
		});

		// The conflict refetch handed the form the row that won, so the version
		// and the diff baseline both come from the new state. Only the engineer's
		// own status change travels; the PM's description is not part of the
		// payload, so the retry cannot revert it.
		const payload = toUpdateTaskPayload(
			{ ...reloaded, status: "DONE" },
			11,
			reloaded,
		);
		expect(payload).toEqual({ version: 11, status: "DONE" });
		expect(payload).not.toHaveProperty("description");
	});

	// Even if the form were still holding the pre-conflict baseline, only the
	// field the user actually edited is sent. The version is what proves the
	// client is out of date and gets the request rejected.
	test("a payload rebuilt from a stale baseline still carries that stale version", () => {
		const stale = toTaskFormValues({ description: "Create landing page" });
		const payload = toUpdateTaskPayload(
			{ ...stale, description: "Updated description" },
			10,
			stale,
		);

		expect(payload).toEqual({
			version: 10,
			description: "Updated description",
		});
	});

	// A field the viewer is not allowed to change must never reach the payload,
	// otherwise the request is guaranteed to come back as a 403.
	test("a locked field is dropped from the payload even when it changed", () => {
		const original = toTaskFormValues({ description: "PM text" });
		const editable = new Set(["title", "status"]);

		const payload = toUpdateTaskPayload(
			{ ...original, description: "Internal rewrite", title: "Renamed" },
			4,
			original,
			editable,
		);

		expect(payload).toEqual({ version: 4, title: "Renamed" });
		expect(payload).not.toHaveProperty("description");
	});

	test("a locked-only change is not treated as a reason to submit", () => {
		const original = toTaskFormValues({ description: "PM text" });
		const editable = new Set(["title", "status"]);

		expect(
			hasTaskFormChanges(
				{ ...original, description: "Internal rewrite" },
				original,
				editable,
			),
		).toBe(false);
	});

	test("an editable change alongside a locked one is still submitted", () => {
		const original = toTaskFormValues({ description: "PM text" });
		const editable = new Set(["title", "status"]);

		expect(
			hasTaskFormChanges(
				{ ...original, description: "Internal rewrite", status: "DONE" },
				original,
				editable,
			),
		).toBe(true);
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

describe("task list filters", () => {
	test("defaults both new filters to unrestricted", () => {
		const parsed = parseTaskListState(new URLSearchParams(""));

		expect(parsed.assignedToId).toBe("any");
		expect(parsed.clientVisible).toBe("any");
	});

	test("round-trips a specific assignee through the URL", () => {
		const assigneeId = "11111111-1111-4111-8111-111111111111";
		const state = {
			...DEFAULT_TASK_LIST_STATE,
			assignedToId: assigneeId,
			clientVisible: "only",
		};

		const parsed = parseTaskListState(serializeTaskListState(state));

		expect(parsed.assignedToId).toBe(assigneeId);
		expect(parsed.clientVisible).toBe("only");
	});

	test("keeps the unassigned keyword, which is not a uuid", () => {
		const parsed = parseTaskListState(
			new URLSearchParams("assignee=unassigned"),
		);

		expect(parsed.assignedToId).toBe("unassigned");
	});

	test("falls back to any for a malformed assignee", () => {
		expect(
			parseTaskListState(new URLSearchParams("assignee=not-a-uuid"))
				.assignedToId,
		).toBe("any");
	});

	test("ignores an unknown visibility keyword", () => {
		expect(
			parseTaskListState(new URLSearchParams("visible=maybe")).clientVisible,
		).toBe("any");
	});

	// The API has no "unassigned" keyword, so it must not be smuggled into the
	// filter object as one: that would be sent to the server and rejected.
	test("sends a specific assignee as a server-side filter", () => {
		const assigneeId = "11111111-1111-4111-8111-111111111111";
		const params = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			assignedToId: assigneeId,
		});

		expect(params.filters).toEqual({ assignedToId: assigneeId });
	});

	test("sends unassigned to the server as a real filter", () => {
		// The API accepts `unassigned` as a value on `assignedToId` and resolves it to
		// a null predicate before counting, so it belongs in the query. It used to be
		// dropped here and narrowed in the browser instead, which meant the reported
		// total counted every task while the list showed a subset of one page.
		const params = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			assignedToId: "unassigned",
		});

		expect(params.filters).toEqual({ assignedToId: "unassigned" });
	});

	test("leaves any alone as no assignee filter at all", () => {
		const params = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			assignedToId: "any",
		});

		expect(params.filters).toEqual({});
	});

	test("maps client visibility onto a boolean filter", () => {
		const only = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			clientVisible: "only",
		});
		const hidden = toTaskListQueryParams({
			...DEFAULT_TASK_LIST_STATE,
			clientVisible: "hidden",
		});

		expect(only.filters).toEqual({ clientVisible: true });
		expect(hidden.filters).toEqual({ clientVisible: false });
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

describe("audit labels", () => {
	test("names every column the server can record", () => {
		expect(AUDITED_COLUMNS.map(getAuditColumnLabel)).toEqual([
			"Title",
			"Description",
			"Assignee",
			"Status",
			"Priority",
			"Department",
			"Client visibility",
			"Task deleted",
		]);
	});

	test("translates stored enum values back into UI wording", () => {
		expect(getAuditValueLabel("status", "IN_PROGRESS")).toBe("In progress");
		expect(getAuditValueLabel("priority", "URGENT")).toBe("Urgent");
		expect(getAuditValueLabel("department", "UI_UX")).toBe("UI/UX");
		expect(getAuditValueLabel("clientVisible", "true")).toBe("Visible");
		expect(getAuditValueLabel("clientVisible", "false")).toBe("Hidden");
	});

	// A nullable column is stored as SQL NULL, which the API returns as JSON
	// null. Rendering that as the text "null" would misreport an empty field as
	// a literal value.
	test("renders a null value as empty rather than the string null", () => {
		expect(getAuditValueLabel("description", null)).toBe("—");
		expect(getAuditValueLabel("assignedToId", null)).toBe("—");
		expect(getAuditValueLabel("deletedAt", null)).toBe("—");
	});

	// The trail is append-only, so a value written by a newer build that this
	// build has no label for still has to render rather than throw.
	test("falls back to the raw value for an unknown enum member", () => {
		expect(getAuditValueLabel("status", "ARCHIVED")).toBe("ARCHIVED");
		expect(getAuditValueLabel("priority", "CRITICAL")).toBe("CRITICAL");
	});

	test("keeps free text values verbatim", () => {
		expect(getAuditValueLabel("title", "Build dashboard")).toBe(
			"Build dashboard",
		);
		expect(getAuditValueLabel("deletedAt", "2026-09-26T04:12:42.1028231")).toBe(
			"2026-09-26T04:12:42.1028231",
		);
	});
});
