import { login, logout } from "../features/auth/api";
import {
	archiveProject,
	createProject,
	getClientProjects,
	getClientProjectTasks,
	getProject,
	listProjectMembers,
	listProjects,
	updateProject,
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
	}

	return projects;
}

async function verifyInternalProjectAccess(email, password) {
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
	});
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

			const { project: updated } = await updateProject(created.id, {
				status: "ARCHIVED",
			});

			assert(
				updated.status === "ARCHIVED",
				`updated project status was ${updated.status}`,
			);
			assert(
				updated.name === created.name,
				"the update replaced omitted fields",
			);

			await archiveProject(created.id);
			await expectStatus(
				getProject(created.id),
				404,
				"archived project detail",
			);

			const afterArchive = await listProjects({ rows: 100 });

			assert(
				!afterArchive.projects.some((project) => project.id === created.id),
				"an archived project is still listed",
			);
		} finally {
			try {
				await archiveProject(created.id);
			} catch {
				// Already archived above; cleanup is best effort.
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
await verifyInternalProjectAccess("pm@aurora.demo", password);
await verifyInternalProjectAccess("uiux@aurora.demo", password);
await verifyProjectQueryContract();
await verifyClientProjectAccess("client@aurora.demo", password);

console.log("Project data integration checks passed.");
