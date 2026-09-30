/**
 * Presentation helpers for a project member.
 *
 * Kept apart from the row component, and free of JSX and React, so the rules
 * here can be exercised directly rather than only through a rendered tree. A
 * monogram is exactly the sort of small function that looks untestable and then
 * quietly gets a second, slightly different implementation somewhere else.
 */

/**
 * Two-letter initials for a person the interface cannot show an avatar for.
 *
 * There is no avatar column in the schema and this feature does not add one, so
 * the fallback is not a stand-in for a missing image — it is the whole visual.
 * Taken from the first two words where there are two, because a one-letter
 * monogram is much harder to tell apart in a list of colleagues.
 *
 * Falls back to "?" rather than an empty span, so a row is never left with a
 * blank circle that reads as a rendering fault.
 */
export function getInitials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);

	if (words.length === 0) {
		return "?";
	}

	if (words.length === 1) {
		return words[0].slice(0, 2).toUpperCase();
	}

	const first = words[0]?.[0] ?? "";
	const second = words[1]?.[0] ?? "";
	return `${first}${second}`.toUpperCase();
}
