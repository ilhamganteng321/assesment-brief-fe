import { getCurrentUser, login, logout, register } from "../features/auth/api";
import { apiClient } from "../lib/api/client";
import { normalizeApiError } from "../lib/api/error";
import { clearAccessToken, setAccessToken } from "../lib/api/token-storage";

import { installRateLimitRetry } from "./install-rate-limit-retry.mjs";

installRateLimitRetry();

const seededUsers = [
	["pm@aurora.demo", "PM", "PRODUCT"],
	["uiux@aurora.demo", "INTERNAL", "UI_UX"],
	["frontend@aurora.demo", "INTERNAL", "FRONTEND"],
	["backend@aurora.demo", "INTERNAL", "BACKEND"],
	["client@aurora.demo", "CLIENT", "CLIENT"],
];

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

async function verifySeededUser(
	email,
	expectedRole,
	expectedDepartment,
	password,
) {
	const session = await login({ email, password });

	assert(
		session.user.role === expectedRole,
		`${email} returned an unexpected role`,
	);
	assert(
		session.user.department === expectedDepartment,
		`${email} returned an unexpected department`,
	);

	setAccessToken(session.accessToken);

	try {
		const currentUser = await getCurrentUser();
		assert(
			currentUser.id === session.user.id,
			`${email} current user did not match`,
		);
		assert(
			currentUser.role === expectedRole,
			`${email} current role did not match`,
		);
	} finally {
		clearAccessToken();
		try {
			await logout(session.accessToken);
		} finally {
			clearAccessToken();
		}
	}
}

async function verifyUnauthorizedResponse() {
	clearAccessToken();
	let status = 0;

	try {
		await getCurrentUser();
	} catch (error) {
		status = normalizeApiError(error).status;
	}

	assert(status === 401, "Unauthenticated /auth/me did not return 401");
}

async function verifyForbiddenResponse(email, password) {
	const session = await login({ email, password });
	setAccessToken(session.accessToken);
	let status = 0;

	try {
		await apiClient.post("/projects", {});
	} catch (error) {
		status = normalizeApiError(error).status;
	} finally {
		clearAccessToken();
		try {
			await logout(session.accessToken);
		} finally {
			clearAccessToken();
		}
	}

	assert(
		status === 403,
		"Authenticated client authorization did not return 403",
	);
}

async function verifyOptionalRegistration(email, password) {
	if (!email) {
		return;
	}

	const session = await register({
		name: "Frontend Integration Check",
		email,
		password,
	});
	setAccessToken(session.accessToken);

	try {
		const currentUser = await getCurrentUser();
		assert(
			currentUser.id === session.user.id,
			"Registered current user did not match",
		);
	} finally {
		clearAccessToken();
		try {
			await logout(session.accessToken);
		} finally {
			clearAccessToken();
		}
	}
}

const backendUrl = process.env.NEXT_PUBLIC_BE_URL;
const password = process.env.AUTH_SMOKE_PASSWORD;

assert(backendUrl, "NEXT_PUBLIC_BE_URL is required");
assert(password, "AUTH_SMOKE_PASSWORD is required");

for (const [email, role, department] of seededUsers) {
	await verifySeededUser(email, role, department, password);
}

await verifyUnauthorizedResponse();
await verifyForbiddenResponse("client@aurora.demo", password);
await verifyOptionalRegistration(
	process.env.AUTH_SMOKE_REGISTER_EMAIL,
	password,
);

console.log("Authentication integration checks passed.");
