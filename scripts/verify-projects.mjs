import { login, logout } from "../features/auth/api";
import {
	createProject,
	deleteProject,
	getClientProjects,
	getClientProjectTasks,
	getProject,
	listProjectMembers,
	listProjects,
	updateProject,
	updateProjectStatus,
} from "../features/projects/api";
import { normalizeApiError } from "../lib/api/error";
import { buildQueryParams } from "../lib/api/query/serialize";
import { clearAccessToken, setAccessToken } from "../lib/api/token-storage";

import { installRateLimitRetry } from "./install-rate-limit-retry.mjs";

installRateLimitRetry();

const PROJECT_STATUSES = new Set([
	"PLANNING",
	"ACTIVE",
	"COMPLETED",
	"ARCHIVED",
]);
const TASK_STATUSES = new Set(["TODO", "BLOCKED", "IN_PROGRESS", "DONE"]);
const RUN_ID = `verify-${Date.now()}`;

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

function assertIsoDate(value, message) {
	assert(
		typeof value === "string" && !Number.isNaN(new Date(value).getTime()),
		message,
	);
}

function assertProjectShape(project, label) {
	assert(
		typeof project.id === "string" && project.id.length > 0,
		`${label} id`,
	);
	assert(
		typeof project.name === "string" && project.name.length > 0,
		`${label} name`,
	);
	assertIsoDate(project.updatedAt, `${label} updatedAt`);
}

function assertPaginationShape(pagination, label) {
	assert(
		typeof pagination?.page === "number" &&
			typeof pagination?.limit === "number" &&
			typeof pagination?.total === "number" &&
			typeof pagination?.totalPages === "number",
		`${label} pagination shape`,
	);
}

function assertClientProjectShape(project, label) {
	assert(
		typeof project.id === "string" && project.id.length > 0,
		`${label} id`,
	);
	assert(
		typeof project.name === "string" && project.name.length > 0,
		`${label} name`,
	);
	assert(
		!("updatedAt" in project) && !("description" in project),
		`${label} leaked internal project fields`,
	);
}

async function expectStatus(promise, expected, label) {
	let status = 0;

	try {
		await promise;
	} catch (error) {
		status = normalizeApiError(error).status;
	}

	assert(
		status === expected,
		`${label} returned ${status}, expected ${expected}`,
	);
}

async function withSession(email, password, run) {
	const session = await login({ email, password });
	setAccessToken(session.accessToken);

	try {
		return await run(session);
	} finally {
		clearAccessToken();
		try {
			await logout(session.accessToken);
		} finally {
			clearAccessToken();
		}
	}
}

function assertProjectList(payload, label) {
	const { projects, pagination } = payload;

	assert(Array.isArray(projects), `${label} project list was not an array`);
	assertPaginationShape(pagination, label);

	for (const project of projects) {
		assertProjectShape(project, `${label} project`);
		assert(
			PROJECT_STATUSES.has(project.status),
			`${label} project ${project.id} had an unexpected status ${project.status}`,
		);
		assert(
			!("deletedAt" in project) && !("members" in project),
			`${label} project ${project.id} leaked internal fields`,
		);
		// The list carries the server's own progress figure, so a bar drawn here
		// and the number on the project it links to cannot disagree.
		assert(
			typeof project.progress?.percentage === "number",
			`${label} project ${project.id} progress percentage`,
		);
	}

	return projects;
}

/**
 * The read surface every internal role shares, plus the write surface that
 * separates them.
 *
 * A project manager may edit and may move a project through its lifecycle; an
 * internal engineer may do neither, despite being able to open the project. That
 * split is the point of the check, so the same read path is walked for both and
 * the expected write result is asserted per role.
 */
async function verifyInternalProjectAccess(email, password, { canWrite }) {
	await withSession(email, password, async () => {
		const projects = assertProjectList(await listProjects(), email);

		if (projects.length === 0) {
			return;
		}

		const target = projects[0];
		const { project } = await getProject(target.id);

		assert(project.id === target.id, `${email} detail id did not match`);
		assertProjectShape(project, `${email} detail`);
		assertIsoDate(project.createdAt, `${email} detail createdAt`);

		const { members } = await listProjectMembers(target.id);

		assert(Array.isArray(members), `${email} member list was not an array`);

		await expectStatus(getClientProjects(), 403, `${email} client dashboard`);

		// Read access is not write access. An internal engineer can open a project
		// they are a member of and still not change anything about it, which is
		// exactly the distinction the role matrix is meant to express. A project
		// manager gets the opposite answer for all three.
		//
		// The status probe re-asserts the status the project already holds, which
		// the server permits as a no-op, so the only thing being tested is the role.
		await expectAllowed(canWrite, () =>
			updateProject(project.id, { clientName: "Verify Write Probe" }),
		);
		await expectAllowed(canWrite, () =>
			updateProjectStatus(project.id, { status: project.status }),
		);

		// Delete is only exercised as a refusal. It is destructive, and the shared
		// project's survival is needed by later checks; the successful delete is
		// covered against a project the fixture owns outright below.
		if (!canWrite) {
			await expectStatus(
				deleteProject(project.id),
				403,
				`${email} deleting a project`,
			);
		}
	});
}

/**
 * Asserts a request either succeeded or was refused with 403.
 *
 * Unlike `expectStatus` this does not pin one outcome, because the caller is
 * checking that the *role* decides the answer and the role is the parameter.
 */
async function expectAllowed(allowed, run) {
	try {
		await run();
		assert(allowed, "the request was refused but the role permits it");
	} catch (error) {
		const status = normalizeApiError(error).status;
		assert(
			!allowed && status === 403,
			`the request was ${allowed ? "allowed" : `refused with ${status}`}` +
				(allowed ? "" : ", expected a 403"),
		);
	}
}

async function verifyProjectQueryContract() {
	await withSession("pm@aurora.demo", password, async () => {
		const { project: created } = await createProject({
			name: `Verify Contract ${RUN_ID}`,
			description: "Frontend query contract verification.",
			clientName: "Verify Client",
			status: "PLANNING",
		});

		assertProjectShape(created, "created project");
		assert(
			created.status === "PLANNING",
			`created project status was ${created.status}`,
		);

		try {
			const filtered = await listProjects({
				filters: { status: "PLANNING" },
				searchFilters: { name: RUN_ID },
				rangedFilters: [{ key: "createdAt", start: "2000-01-01" }],
				orderKey: "name",
				orderRule: "asc",
				page: 1,
				rows: 5,
			});
			const filteredProjects = assertProjectList(filtered, "filtered list");

			assert(
				filteredProjects.some((project) => project.id === created.id),
				"the created project was missing from its own filtered result",
			);
			assert(
				filteredProjects.every((project) => project.status === "PLANNING"),
				"status filter was not applied",
			);
			assert(
				filteredProjects.every((project) => project.name.includes(RUN_ID)),
				"name search filter was not applied",
			);
			assert(filteredProjects.length <= 5, "rows limit was not applied");

			const empty = await listProjects({
				searchFilters: { name: `no-match-${RUN_ID}` },
			});

			assert(
				empty.projects.length === 0,
				"a non-matching search should return no projects",
			);

			// Metadata only: the lifecycle has its own endpoint, so a rename cannot
			// double as a status change.
			const { project: updated } = await updateProject(created.id, {
				clientName: "Verify Client Renamed",
			});

			assert(
				updated.clientName === "Verify Client Renamed",
				`updated project client was ${updated.clientName}`,
			);
			assert(
				updated.name === created.name,
				"the update replaced omitted fields",
			);
			assert(
				updated.status === created.status,
				"a metadata edit changed the project status",
			);

			// The lifecycle only moves forward one step at a time, so the project is
			// walked rather than jumped. A skip is a 409 naming both ends.
			await expectStatus(
				updateProjectStatus(created.id, { status: "ARCHIVED" }),
				409,
				"PLANNING to ARCHIVED",
			);

			for (const status of ["ACTIVE", "COMPLETED", "ARCHIVED"]) {
				const moved = await updateProjectStatus(created.id, { status });
				assert(
					moved.project.status === status,
					`moving to ${status} produced ${moved.project.status}`,
				);
			}

			// ARCHIVED is terminal: there is no reopen, and an archived project is
			// read-only while remaining fully readable.
			await expectStatus(
				updateProjectStatus(created.id, { status: "ACTIVE" }),
				409,
				"ARCHIVED to ACTIVE",
			);
			await expectStatus(
				updateProject(created.id, { name: "Renamed after archiving" }),
				409,
				"editing an archived project",
			);

			const archivedDetail = await getProject(created.id);

			assert(
				archivedDetail.project.status === "ARCHIVED",
				"an archived project stopped being readable",
			);
			assert(
				archivedDetail.project.name === created.name,
				"an archived project lost its metadata",
			);

			const afterArchive = await listProjects({ rows: 100 });

			assert(
				!afterArchive.projects.some((project) => project.id === created.id),
				"a soft deleted project is still listed",
			);

			await deleteProject(created.id);
			await expectStatus(getProject(created.id), 404, "deleted project detail");
		} finally {
			try {
				await deleteProject(created.id);
			} catch {
				// Already deleted above; cleanup is best effort.
			}
		}
	});
}

async function verifyQuerySerialization() {
	const params = buildQueryParams({
		filters: { status: "ACTIVE" },
		searchFilters: { name: "aurora" },
		rangedFilters: [{ key: "createdAt", start: "2026-01-01" }],
		orderKey: "name",
		orderRule: "asc",
		page: 2,
		rows: 25,
	});
	const serialized = new URLSearchParams(params);

	assert(
		serialized.get("filters") === JSON.stringify({ status: "ACTIVE" }),
		"filters were not serialized as JSON",
	);
	assert(
		serialized.get("searchFilters") === JSON.stringify({ name: "aurora" }),
		"searchFilters were not serialized as JSON",
	);
	assert(
		serialized.get("orderKey") === "name" &&
			serialized.get("orderRule") === "asc",
		"ordering parameters were not forwarded",
	);
	assert(
		serialized.get("page") === "2" && serialized.get("rows") === "25",
		"pagination parameters were not forwarded",
	);
}

async function verifyClientProjectAccess(email, password) {
	const { projects: allProjects } = await listProjectsFor("pm@aurora.demo");
	const clientProjectIds = new Set();

	await withSession(email, password, async () => {
		const { projects } = await getClientProjects();

		assert(Array.isArray(projects), `${email} dashboard was not an array`);

		for (const project of projects) {
			assertClientProjectShape(project, `${email} dashboard project`);
			assert(
				typeof project.progress?.percentage === "number",
				`${email} dashboard project ${project.id} progress percentage`,
			);
			for (const metric of [
				"total",
				"completed",
				"inProgress",
				"todo",
				"blocked",
			]) {
				assert(
					typeof project.tasks?.[metric] === "number",
					`${email} dashboard project ${project.id} metric ${metric}`,
				);
			}
			clientProjectIds.add(project.id);
		}

		await expectStatus(listProjects(), 403, `${email} internal project list`);

		const foreignProject = allProjects.find(
			(project) => !clientProjectIds.has(project.id),
		);

		if (foreignProject) {
			await expectStatus(
				getProject(foreignProject.id),
				403,
				`${email} foreign project detail`,
			);
		}

		if (projects.length === 0) {
			return;
		}

		const target = projects[0];
		const { tasks, pagination } = await getClientProjectTasks(target.id, {
			page: 1,
			limit: 5,
		});

		assert(Array.isArray(tasks), `${email} task list was not an array`);
		assert(
			tasks.length <= 5,
			`${email} task list returned more than the requested limit`,
		);
		assertPaginationShape(pagination, `${email} task`);

		for (const task of tasks) {
			assert(typeof task.id === "string", `${email} task id`);
			assert(
				typeof task.title === "string" && task.title.length > 0,
				`${email} task title`,
			);
			assert(
				TASK_STATUSES.has(task.status),
				`${email} task ${task.id} had an unexpected status ${task.status}`,
			);
			assert(
				task.clientVisible === true,
				`${email} task ${task.id} was not client visible`,
			);
		}

		const filtered = await getClientProjectTasks(target.id, {
			page: 1,
			limit: 5,
			status: "DONE",
			search: "a",
		});

		assert(
			filtered.tasks.every((task) => task.status === "DONE"),
			`${email} status filter was not applied`,
		);
	});
}

async function listProjectsFor(email) {
	return withSession(email, password, async () => {
		const projects = assertProjectList(await listProjects(), email);

		return { projects };
	});
}

async function verifyUnauthenticatedAccess() {
	clearAccessToken();
	await expectStatus(getClientProjects(), 401, "unauthenticated dashboard");
	await expectStatus(listProjects(), 401, "unauthenticated project list");
}

const backendUrl = process.env.NEXT_PUBLIC_BE_URL;
const password = process.env.AUTH_SMOKE_PASSWORD;

assert(backendUrl, "NEXT_PUBLIC_BE_URL is required");
assert(password, "AUTH_SMOKE_PASSWORD is required");

await verifyQuerySerialization();
await verifyUnauthenticatedAccess();
await verifyInternalProjectAccess("pm@aurora.demo", password, {
	canWrite: true,
});
await verifyInternalProjectAccess("uiux@aurora.demo", password, {
	canWrite: false,
});
await verifyProjectQueryContract();
await verifyClientProjectAccess("client@aurora.demo", password);

console.log("Project data integration checks passed.");
