import type { ProjectMember, ProjectMemberCandidate } from "./types";

/**
 * The member-list filter, kept as a pure function.
 *
 * Filtering runs in the browser rather than on the server, and that is a
 * deliberate exception to how the rest of this feature works. A project's
 * membership is a small, already-loaded set — the whole list is on screen — so a
 * server round trip per keystroke would add latency and requests to buy nothing.
 * The one place that *is* server-side is the candidate search, because its input
 * set is the entire organisation and cannot be assumed small.
 *
 * Matching the same two fields the server matches, so filtering a loaded list
 * and searching the organisation agree about what a name or an address is.
 */

/**
 * Mirrors the backend's minimum search length.
 *
 * Two characters is the point at which a search stops matching most of the
 * organisation. Kept in step with the server so the interface does not offer a
 * search that the API has already decided is not worth running.
 */
export const MIN_MEMBER_CANDIDATE_SEARCH = 2;

/**
 * A case-insensitive "contains" match.
 *
 * Deliberately a plain substring test, so a `%` or `_` typed into the filter is
 * matched as the literal character it looks like. A user searching for "100%"
 * is looking for the text `100%`, not asking for a wildcard — and this filter
 * never reaches SQL, so there is no pattern to escape in the first place.
 */
export function matchesMemberSearch(
	needle: string,
	...haystacks: readonly (string | null | undefined)[]
): boolean {
	const trimmed = needle.trim();
	if (trimmed.length === 0) {
		return true;
	}

	const pattern = trimmed.toLowerCase();
	return haystacks.some((value) =>
		(value ?? "").toLowerCase().includes(pattern),
	);
}

/**
 * Filters an already-loaded member list.
 *
 * Matches a member's name or their address, the same pair the candidate search
 * covers, so the two surfaces never disagree about whether somebody is findable.
 */
export function filterProjectMembers(
	members: readonly ProjectMember[],
	search: string,
): ProjectMember[] {
	if (search.trim().length === 0) {
		return [...members];
	}

	return members.filter((member) =>
		matchesMemberSearch(search, member.user.name, member.user.email),
	);
}

/**
 * Whether a search is worth sending to the candidate endpoint.
 *
 * Below the minimum the server would answer with an empty page, so the interface
 * skips the request entirely rather than asking on every keystroke of a field
 * the user has just cleared.
 */
export function isSearchableCandidateQuery(search: string): boolean {
	return search.trim().length >= MIN_MEMBER_CANDIDATE_SEARCH;
}

/**
 * Whether a candidate can be picked.
 *
 * Somebody already on the project is shown but not selectable: the flag comes
 * from the server, and the add endpoint refuses a duplicate regardless, so this
 * only stops the interface from offering something that will be rejected. It is
 * a courtesy, not the rule.
 */
export function isSelectableCandidate(
	candidate: ProjectMemberCandidate,
): boolean {
	return !candidate.alreadyMember;
}
