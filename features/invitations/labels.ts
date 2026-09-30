import type { InvitationStatus } from "./types";

/**
 * How each invitation state is named, and what a person can still do about it.
 *
 * One table rather than a `switch` in each component, so the status badge, the row
 * actions and the acceptance screen cannot disagree about what PENDING means.
 * The wording is the product's, not the enum's: `CANCELED` is rendered "Withdrawn",
 * because a project manager withdrew an invitation and did not cancel a message.
 */
const STATUS_PRESENTATION: Record<
	InvitationStatus,
	{ label: string; description: string }
> = {
	PENDING: {
		label: "Pending",
		description:
			"The emailed link has not been used yet and the project can still be joined.",
	},
	ACCEPTED: {
		label: "Accepted",
		description:
			"Somebody signed in as the invited address and joined. The membership exists.",
	},
	EXPIRED: {
		label: "Expired",
		description:
			"The link has passed its expiry. Resend it to invite this address again.",
	},
	CANCELED: {
		label: "Withdrawn",
		description:
			"The link no longer works. Resend it to invite this address again.",
	},
};

export function getInvitationStatusLabel(status: InvitationStatus): string {
	return STATUS_PRESENTATION[status].label;
}

export function getInvitationStatusDescription(
	status: InvitationStatus,
): string {
	return STATUS_PRESENTATION[status].description;
}

/**
 * A date, formatted for reading.
 *
 * The stored value is a full ISO timestamp; nobody needs the time of day to decide
 * whether a link has another six days. Returns an em dash for a missing value
 * rather than "Invalid Date", because this renders inside a table cell where a
 * broken-looking string reads as a bug in the interface.
 */
export function formatInvitationDate(value: string | null): string {
	if (value === null) {
		return "—";
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return "—";
	}

	return parsed.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

/**
 * How much longer a pending link works.
 *
 * Relative, because the question a project manager is asking about a pending
 * invitation is "can I still rely on this one", and an absolute date makes them do
 * the subtraction. Past and today both read as expired, which matches the server:
 * the link stops working at the instant, not at the end of the day.
 */
export function getInvitationTimeRemaining(
	expiresAt: string,
	now: Date = new Date(),
): { expired: boolean; label: string } {
	const parsed = new Date(expiresAt);
	if (Number.isNaN(parsed.getTime())) {
		return { expired: true, label: "Expired" };
	}

	const days = Math.ceil((parsed.getTime() - now.getTime()) / 86_400_000);

	if (days <= 0) {
		return { expired: true, label: "Expired" };
	}
	if (days === 1) {
		return { expired: false, label: "Expires tomorrow" };
	}
	return { expired: false, label: `Expires in ${String(days)} days` };
}
