import { describe, expect, test } from "bun:test";
import { USER_DEPARTMENTS } from "../features/auth/types.ts";
import { getDepartmentLabel } from "../features/projects/labels.ts";
import { getInitials } from "../features/projects/member-display.ts";
import {
	filterProjectMembers,
	isSearchableCandidateQuery,
	isSelectableCandidate,
	MIN_MEMBER_CANDIDATE_SEARCH,
	matchesMemberSearch,
} from "../features/projects/member-search.ts";
import {
	canDeleteProject,
	canEditProject,
	canManageProjectMembers,
	canManageProjectMembersNow,
	canSearchProjectMemberCandidates,
} from "../features/projects/permissions.ts";

// ---------------------------------------------------------------------------
// Project membership, as the interface understands it.
//
// These mirror the server's rules. The point is drift: if the backend's gate
// changes and this one does not, the interface starts offering controls the API
// refuses. Each case corresponds to a server test in
// `tests/members/members.integration.ts`.
// ---------------------------------------------------------------------------

const pm = { role: "PM" };
const internal = { role: "INTERNAL" };
const client = { role: "CLIENT" };
const anonymous = { role: undefined };

function member(overrides = {}) {
	return {
		id: "6b1c0a5e-6d5b-4f21-9c3f-8f0d1a2b3c4d",
		projectId: "1f4c2d3e-6d5b-4f21-9c3f-8f0d1a2b3c4d",
		userId: "3c9a1e8a-6d5b-4f21-9c3f-8f0d1a2b3c4d",
		createdAt: "2026-01-01T00:00:00.000Z",
		user: {
			id: "3c9a1e8a-6d5b-4f21-9c3f-8f0d1a2b3c4d",
			name: "John Doe",
			email: "john@example.com",
			role: "INTERNAL",
			department: "FRONTEND",
		},
		...overrides,
	};
}

describe("project membership permissions", () => {
	test("only a project manager may change membership", () => {
		expect(canManageProjectMembers(pm)).toBe(true);
		expect(canManageProjectMembers(internal)).toBe(false);
		expect(canManageProjectMembers(client)).toBe(false);
		expect(canManageProjectMembers(anonymous)).toBe(false);
	});

	// The candidate search exists to serve the add flow. Exposing it to a role
	// that cannot add would hand the organisation's user list to anyone who can
	// open a project.
	test("candidate search is gated by the same rule as adding", () => {
		expect(canSearchProjectMemberCandidates(pm)).toBe(true);
		expect(canSearchProjectMemberCandidates(internal)).toBe(false);
		expect(canSearchProjectMemberCandidates(client)).toBe(false);
		expect(canSearchProjectMemberCandidates(anonymous)).toBe(false);
	});

	test("candidate search never widens the permission to add", () => {
		for (const user of [pm, internal, client, anonymous]) {
			if (canSearchProjectMemberCandidates(user)) {
				expect(canManageProjectMembers(user)).toBe(true);
			}
		}
	});

	// Membership is a change to the project, and an archived project is read-only
	// for exactly that reason. The server answers 409 PROJECT_ARCHIVED.
	test("an archived project's roster cannot be changed", () => {
		expect(canManageProjectMembersNow(pm, { status: "ACTIVE" })).toBe(true);
		expect(canManageProjectMembersNow(pm, { status: "COMPLETED" })).toBe(true);
		expect(canManageProjectMembersNow(pm, { status: "ARCHIVED" })).toBe(false);
	});

	test("an internal user never sees the member controls", () => {
		for (const status of ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]) {
			expect(canManageProjectMembersNow(internal, { status })).toBe(false);
		}
	});

	// The broader project gates, asserted together so a change to any one of
	// them that widened access would be caught here.
	test("the project mutation gates stay PM-only", () => {
		for (const user of [internal, client, anonymous]) {
			expect(canEditProject(user)).toBe(false);
			expect(canDeleteProject(user)).toBe(false);
		}
		expect(canEditProject(pm)).toBe(true);
		expect(canDeleteProject(pm)).toBe(true);
	});
});

describe("member search", () => {
	test("matches a name case-insensitively", () => {
		expect(matchesMemberSearch("john", "John Doe")).toBe(true);
		expect(matchesMemberSearch("JOHN", "John Doe")).toBe(true);
		expect(matchesMemberSearch("doe", "John Doe")).toBe(true);
	});

	test("matches an email", () => {
		expect(
			matchesMemberSearch("example.com", "anything", "john@example.com"),
		).toBe(true);
		expect(matchesMemberSearch("other@", "anything", "john@example.com")).toBe(
			false,
		);
	});

	// A `%` or `_` typed into the filter is matched as the literal character it
	// looks like: someone searching "100%" is looking for the text, not asking
	// for a wildcard.
	test("wildcards in the search are matched literally", () => {
		expect(matchesMemberSearch("100%", "100% complete")).toBe(true);
		expect(matchesMemberSearch("100%", "1000 percent")).toBe(false);
		expect(matchesMemberSearch("a_b", "a_b")).toBe(true);
		expect(matchesMemberSearch("a_b", "axb")).toBe(false);
	});

	test("an empty search matches everything", () => {
		expect(matchesMemberSearch("", "anything")).toBe(true);
		expect(matchesMemberSearch("   ", "anything")).toBe(true);
	});

	test("a null or undefined field does not throw", () => {
		expect(matchesMemberSearch("john", null, undefined)).toBe(false);
	});

	test("filters a member list by name or email", () => {
		const members = [
			member(),
			member({
				id: "b",
				user: {
					id: "b",
					name: "Ada Lovelace",
					email: "ada@example.com",
					role: "PM",
					department: "PRODUCT",
				},
			}),
		];

		expect(
			filterProjectMembers(members, "ada").map((row) => row.user.name),
		).toEqual(["Ada Lovelace"]);
		expect(
			filterProjectMembers(members, "example.com").map((row) => row.user.name),
		).toEqual(["John Doe", "Ada Lovelace"]);
	});

	// No filter means the whole list, returned as a copy so a caller cannot sort
	// the query cache's own array in place.
	test("an empty filter returns every member, without aliasing the source", () => {
		const members = [member()];
		const result = filterProjectMembers(members, "  ");

		expect(result).toHaveLength(1);
		expect(result).not.toBe(members);
	});

	test("a filter matching nobody returns nothing", () => {
		expect(filterProjectMembers([member()], "zzz-nobody")).toEqual([]);
	});

	// Below the minimum the server answers with an empty page, so the interface
	// must not ask. The two constants have to agree or one of the two is wrong.
	test("a candidate search is only sent from two characters", () => {
		expect(MIN_MEMBER_CANDIDATE_SEARCH).toBe(2);
		expect(isSearchableCandidateQuery("a")).toBe(false);
		expect(isSearchableCandidateQuery("  ")).toBe(false);
		expect(isSearchableCandidateQuery("")).toBe(false);
		expect(isSearchableCandidateQuery("jo")).toBe(true);
		expect(isSearchableCandidateQuery(" john ")).toBe(true);
	});

	test("a candidate already on the project cannot be picked", () => {
		const candidate = {
			id: "a",
			name: "John Doe",
			email: "john@example.com",
			role: "INTERNAL",
			department: "FRONTEND",
			alreadyMember: false,
		};

		expect(isSelectableCandidate(candidate)).toBe(true);
		expect(isSelectableCandidate({ ...candidate, alreadyMember: true })).toBe(
			false,
		);
	});
});

describe("member display", () => {
	// The schema has no avatar column, so the initials are the whole visual and
	// have to distinguish people without one.
	test("initials come from the first two words", () => {
		expect(getInitials("John Doe")).toBe("JD");
		expect(getInitials("Ada Lovelace King")).toBe("AL");
	});

	test("a single name yields two letters", () => {
		expect(getInitials("Prince")).toBe("PR");
	});

	test("a blank or unusual name still yields a monogram", () => {
		expect(getInitials("")).toBe("?");
		expect(getInitials("   ")).toBe("?");
		expect(getInitials("A")).toBe("A");
	});

	test("surrounding and repeated whitespace is ignored", () => {
		expect(getInitials("  John   Doe  ")).toBe("JD");
	});

	// The stored value is a fine identifier but reads as shouting to a person.
	test("every department has a readable label", () => {
		for (const department of USER_DEPARTMENTS) {
			const label = getDepartmentLabel(department);
			expect(label.length).toBeGreaterThan(0);
			expect(label).not.toBe(department);
		}
	});

	test("the client department is spelled out rather than abbreviated", () => {
		expect(getDepartmentLabel("CLIENT")).toBe("Client");
	});
});
