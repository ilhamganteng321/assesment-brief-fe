import { describe, expect, test } from "bun:test";
import { AxiosError, AxiosHeaders } from "axios";

import {
	getAuthPageHref,
	getPostAuthPath,
} from "../features/auth/redirects.ts";
import { getAcceptanceErrorMessage } from "../features/invitations/components/invitation-accept-section.tsx";
import {
	normalizeEmail,
	validateEmail,
} from "../features/invitations/components/invitation-create-dialog.tsx";
import { isInvitationToken } from "../features/invitations/hooks.ts";
import {
	formatInvitationDate,
	getInvitationStatusDescription,
	getInvitationStatusLabel,
	getInvitationTimeRemaining,
} from "../features/invitations/labels.ts";
import {
	canAcceptInvitation,
	canCancelInvitation,
	canManageProjectInvitations,
	canManageProjectInvitationsNow,
	canResendInvitation,
} from "../features/invitations/permissions.ts";
import { INVITATION_STATUSES } from "../features/invitations/types.ts";

// ---------------------------------------------------------------------------
// Project invitations, as the interface understands it.
//
// Two things are worth testing here, and neither is a rendering test.
//
// The permission and status cases mirror the server's rules, because the drift this
// catches is invisible: a button that the API refuses is an error dialog, not a
// missing feature, and nobody files a bug about it until they click it.
//
// The token handling is the other half. The whole design rests on a value that
// lives in a URL, survives a detour through sign-in, and is never stored — and each
// of those three is a place a refactor can quietly break it.
// ---------------------------------------------------------------------------

const pm = { role: "PM" };
const internal = { role: "INTERNAL" };
const client = { role: "CLIENT" };
const anonymous = { role: undefined };

const live = { status: "ACTIVE" };
const archived = { status: "ARCHIVED" };
const completed = { status: "COMPLETED" };

describe("invitation permissions", () => {
	// Mirrors `canManageProjectInvitations`, granted to PM alone.
	test("only a project manager may manage invitations", () => {
		expect(canManageProjectInvitations(pm)).toBe(true);
		expect(canManageProjectInvitations(internal)).toBe(false);
		expect(canManageProjectInvitations(client)).toBe(false);
		expect(canManageProjectInvitations(anonymous)).toBe(false);
	});

	// An archived project refuses with 409 PROJECT_ARCHIVED on every path.
	test("an archived project offers no invitation controls at all", () => {
		expect(canManageProjectInvitationsNow(pm, live)).toBe(true);
		expect(canManageProjectInvitationsNow(pm, completed)).toBe(true);
		expect(canManageProjectInvitationsNow(pm, archived)).toBe(false);
		// And the role still has to be PM, so an archived project is not the only
		// thing standing between an internal user and the controls.
		expect(canManageProjectInvitationsNow(internal, live)).toBe(false);
	});

	// Accepted is final: the membership exists, so both actions would be refused.
	test("an accepted invitation offers neither a resend nor a withdrawal", () => {
		expect(canResendInvitation("ACCEPTED")).toBe(false);
		expect(canCancelInvitation("ACCEPTED")).toBe(false);
	});

	test("every other status can still be resent or withdrawn", () => {
		for (const status of ["PENDING", "EXPIRED", "CANCELED"]) {
			expect(canResendInvitation(status)).toBe(true);
			expect(canCancelInvitation(status)).toBe(true);
		}
	});

	// The button is the server's `usable` and nothing else, because the identity
	// half of the decision is not knowable in a browser.
	test("the accept button follows the server's usable flag", () => {
		expect(canAcceptInvitation(true)).toBe(true);
		expect(canAcceptInvitation(false)).toBe(false);
	});
});

describe("invitation status wording", () => {
	test("all four statuses have a label and an explanation", () => {
		// A missing entry here would render an empty badge, which reads as a bug
		// rather than as "no status".
		for (const status of INVITATION_STATUSES) {
			expect(getInvitationStatusLabel(status).length).toBeGreaterThan(0);
			expect(getInvitationStatusDescription(status).length).toBeGreaterThan(0);
		}
	});

	test("a withdrawn invitation is not called cancelled", () => {
		// The project manager withdrew an invitation; they did not cancel a message.
		// `CANCELED` is the enum, not the word a person should read.
		expect(getInvitationStatusLabel("CANCELED")).toBe("Withdrawn");
		expect(getInvitationStatusLabel("PENDING")).toBe("Pending");
	});

	test("a missing or unparseable date renders as a dash", () => {
		// These land in table cells, where "Invalid Date" looks like a fault in the
		// interface rather than missing data.
		expect(formatInvitationDate(null)).toBe("—");
		expect(formatInvitationDate("not a date")).toBe("—");
		expect(formatInvitationDate("2026-10-07T00:00:00.000Z")).toContain("2026");
	});
});

describe("invitation expiry wording", () => {
	const now = new Date("2026-09-30T12:00:00.000Z");

	test("a future expiry is counted in days", () => {
		const three = getInvitationTimeRemaining("2026-10-03T12:00:00.000Z", now);
		expect(three.expired).toBe(false);
		expect(three.label).toBe("Expires in 3 days");

		// Tomorrow reads as tomorrow, not as "in 1 days".
		const tomorrow = getInvitationTimeRemaining(
			"2026-10-01T12:00:00.000Z",
			now,
		);
		expect(tomorrow.label).toBe("Expires tomorrow");
	});

	test("a passed or unparseable expiry reads as expired", () => {
		// The link stops working at the instant, not at the end of the day, which is
		// what the server does too.
		expect(
			getInvitationTimeRemaining("2026-09-30T11:59:00.000Z", now).expired,
		).toBe(true);
		expect(
			getInvitationTimeRemaining("2026-09-30T12:00:00.000Z", now).expired,
		).toBe(true);
		expect(getInvitationTimeRemaining("nonsense", now).expired).toBe(true);
	});
});

describe("the invitation token in the browser", () => {
	const token = "a".repeat(43);

	test("the issued shape is recognised", () => {
		expect(isInvitationToken(token)).toBe(true);
		// Base64url only: no padding, no characters a URL would have to escape.
		expect(isInvitationToken(`-_${"b".repeat(41)}`)).toBe(true);
	});

	test("anything else is rejected before a request is made", () => {
		// Wrong length, padding, a percent-encoded value, a missing parameter. Each
		// of these would only be refused by the server, so catching them here saves
		// a round trip and a confusing error.
		expect(isInvitationToken(undefined)).toBe(false);
		expect(isInvitationToken("")).toBe(false);
		expect(isInvitationToken("short")).toBe(false);
		expect(isInvitationToken(`${"a".repeat(42)}`)).toBe(false);
		expect(isInvitationToken(`${"a".repeat(44)}`)).toBe(false);
		expect(isInvitationToken(`${"a".repeat(42)}=`)).toBe(false);
		expect(isInvitationToken(`${"a".repeat(42)}+`)).toBe(false);
		expect(isInvitationToken(`${"a".repeat(42)}/../x`)).toBe(false);
	});

	test("the token survives the sign-in detour and is never stored", () => {
		// The page lives in the authenticated layout group, so an unauthenticated
		// visit is redirected to sign in with this exact URL as the return path.
		// That is the whole handoff: it works because the token is still in the URL,
		// and there is no store to clear because nothing was ever written down.
		const acceptUrl = "/invitations/accept?token=abc123";
		const login = getAuthPageHref("login", acceptUrl);

		expect(login).toContain("redirect=");
		expect(
			getPostAuthPath(decodeURIComponent(login.split("redirect=")[1])),
		).toBe(acceptUrl);
	});

	test("a hostile return path cannot smuggle the token out of the site", () => {
		// The same sanitiser every other post-auth redirect uses. Worth pinning here
		// because the invitation URL is attacker-influenced: the value comes from an
		// email, which is the easiest thing in the product to send somebody.
		for (const hostile of [
			"https://evil.example.com/invitations/accept?token=x",
			"//evil.example.com/x",
			"/\\evil",
			"/invitations/accept%0aLocation:%20https://evil.example.com",
		]) {
			expect(getPostAuthPath(hostile)).toBe("/dashboard");
		}
	});
});

describe("email normalization in the invite form", () => {
	test("the address is stored the way the server compares it", () => {
		// Acceptance compares the signed-in account against the stored address as a
		// string equality, so this is the difference between a recipient joining and
		// being locked out of their own invitation.
		expect(normalizeEmail("  Ada@Example.COM  ")).toBe("ada@example.com");
	});

	test("the form refuses what the server would refuse", () => {
		expect(validateEmail("")).toBe("Enter an email address.");
		expect(validateEmail("not-an-address")).toBe(
			"Enter a valid email address.",
		);
		expect(validateEmail("a@b")).toBe("Enter a valid email address.");
		expect(validateEmail(`${"a".repeat(250)}@example.com`)).toContain("255");
		expect(validateEmail("ada@example.com")).toBeNull();
		expect(validateEmail("ada.lovelace+tag@sub.example.co.uk")).toBeNull();
	});
});

describe("refused acceptances", () => {
	// Each of these is a case the preview said would work and the write refused.
	// "Something went wrong" on the one action somebody took to join a project is
	// the least useful thing the page could say.
	function createBackendError(status, code, extra = {}) {
		return new AxiosError(
			"Request failed",
			"ERR_BAD_RESPONSE",
			undefined,
			undefined,
			{
				data: {
					success: false,
					error: { code, message: "raw", ...extra },
				},
				status,
				statusText: "Backend error",
				headers: {},
				config: { headers: new AxiosHeaders() },
			},
		);
	}

	const cases = [
		["INVITATION_ALREADY_ACCEPTED", /already been accepted/i],
		["INVITATION_EXPIRED", /expired/i],
		["INVITATION_CANCELED", /withdrawn/i],
		["INVITATION_ALREADY_MEMBER", /already a member/i],
		["INVITATION_PROJECT_UNAVAILABLE", /archived|no longer exists/i],
		["INVITATION_NOT_FOUND", /no longer valid/i],
	];

	for (const [code, expected] of cases) {
		test(`${code} says something a person can act on`, () => {
			const message = getAcceptanceErrorMessage(
				createBackendError(409, code),
				"ada@example.com",
			);

			expect(message).toMatch(expected);
			expect(message).not.toBe("raw");
		});
	}

	test("an email mismatch names the address the invitation is waiting for", () => {
		// A person signed in as the wrong account, or with several, needs to know
		// which one to switch to. Telling them "not found" would send them to sign up
		// a second account that still would not match.
		const message = getAcceptanceErrorMessage(
			createBackendError(409, "INVITATION_EMAIL_MISMATCH", {
				invitedEmail: "ada@example.com",
			}),
			"ada@example.com",
		);

		expect(message).toContain("ada@example.com");
	});

	test("a deleted project says so, and an archived one says so", () => {
		// The two are reported with the same code, so the screen would otherwise say
		// "archived" to somebody whose project was deleted — or, worse, suggest a
		// retry that can never work.
		expect(
			getAcceptanceErrorMessage(
				createBackendError(409, "INVITATION_PROJECT_UNAVAILABLE", {
					projectStatus: "DELETED",
				}),
				"ada@example.com",
			),
		).toMatch(/no longer exists/i);

		expect(
			getAcceptanceErrorMessage(
				createBackendError(409, "INVITATION_PROJECT_UNAVAILABLE", {
					projectStatus: "ARCHIVED",
				}),
				"ada@example.com",
			),
		).toMatch(/archived/i);
	});

	test("an unrecognised failure still says something", () => {
		// Never an empty string and never the raw driver text: this is the one place
		// a person is told why they are not on the project they were just invited to.
		const message = getAcceptanceErrorMessage(
			createBackendError(500, "INTERNAL_ERROR", { message: "" }),
			"ada@example.com",
		);

		expect(message.length).toBeGreaterThan(0);
	});
});
