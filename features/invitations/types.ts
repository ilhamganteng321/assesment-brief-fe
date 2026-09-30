/**
 * Re-exported rather than restated, so there is exactly one definition of a
 * user's role in the codebase. A second copy of the union would be free to drift
 * from the one the server sends, and the drift would only surface as an
 * unexplained type error somewhere unrelated.
 */
export type { UserRole } from "@/features/auth/types";

/**
 * The states an invitation can be in.
 *
 * The same four values the server reports. `PENDING` is the only one from which a
 * link can still be accepted, and `EXPIRED` is derived from the clock rather than
 * written — the server decides that, and this list only has to name the outcomes.
 */
export const INVITATION_STATUSES = [
	"PENDING",
	"ACCEPTED",
	"EXPIRED",
	"CANCELED",
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** Who sent an invitation, as the API reports them. */
export type InvitationSender = {
	id: string;
	name: string;
	email: string;
};

/**
 * An invitation as the project manager sees it.
 *
 * There is no `token` and no `tokenHash`, and their absence is not an oversight:
 * the server never sends them. An interface that offered "copy the invite link"
 * would need the browser to hold a live credential for somebody else's project
 * access, which is exactly the disclosure the hashing exists to prevent.
 */
export type ProjectInvitation = {
	id: string;
	projectId: string;
	email: string;
	status: InvitationStatus;
	expiresAt: string;
	acceptedAt: string | null;
	createdAt: string;
	updatedAt: string;
	invitedBy: InvitationSender;
};

/**
 * What the acceptance page shows before anyone acts.
 *
 * `usable` folds three questions into one: the invitation is still pending, its
 * project can still be joined, and it is addressed to the account that is signed
 * in. The page branches on it rather than on `status` alone, so it can offer a
 * button or explain why not — and never presents a control that is guaranteed to
 * fail.
 */
export type InvitationPreview = {
	email: string;
	project: {
		id: string;
		name: string;
	};
	invitedBy: InvitationSender;
	status: InvitationStatus;
	usable: boolean;
	expiresAt: string;
};

/** What accepting an invitation returns. */
export type InvitationAcceptance = {
	invitation: {
		id: string;
		projectId: string;
		email: string;
		acceptedAt: string;
	};
	member: {
		id: string;
		projectId: string;
		userId: string;
		createdAt: string;
	};
	project: {
		id: string;
		name: string;
	};
};

export type ProjectInvitationList = {
	invitations: ProjectInvitation[];
};

export type CreateInvitationPayload = {
	email: string;
};
