import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/lib/api/types";

import type {
	CreateInvitationPayload,
	InvitationAcceptance,
	InvitationPreview,
	ProjectInvitation,
	ProjectInvitationList,
} from "./types";

// ---------------------------------------------------------------------------
// The invitation API, one function per route.
//
// Nothing here decides anything. There is no client-side pre-check of the project
// status, the duplicate rule or the expiry: each of those is a rule the server owns
// and re-evaluates, and a browser that second-guessed it would drift from the
// answer and show a message about a rule that is not the one that refused.
// ---------------------------------------------------------------------------

/**
 * Everyone this project has ever invited, newest first.
 *
 * Accepted and canceled rows included, because the question this list answers is
 * "who was invited and what became of it".
 */
export async function listProjectInvitations(
	projectId: string,
	signal?: AbortSignal,
): Promise<ProjectInvitation[]> {
	const response = await apiClient.get<
		ApiSuccessResponse<ProjectInvitationList>
	>(`/projects/${projectId}/invitations`, { signal });
	return response.data.data.invitations;
}

/**
 * Invites an address and emails them a link.
 *
 * The returned invitation carries no token, so there is nothing here to copy into
 * a clipboard: the only copy of the link is the one in the recipient's inbox. The
 * caller reports success on the strength of this resolving, which the server only
 * does once the mail has actually been handed to the transport.
 */
export async function createProjectInvitation(
	projectId: string,
	payload: CreateInvitationPayload,
): Promise<ProjectInvitation> {
	const response = await apiClient.post<
		ApiSuccessResponse<{ invitation: ProjectInvitation }>
	>(`/projects/${projectId}/invitations`, payload);
	return response.data.data.invitation;
}

/** Reissues the token, which is what a resend means. */
export async function resendProjectInvitation(
	projectId: string,
	invitationId: string,
): Promise<ProjectInvitation> {
	const response = await apiClient.post<
		ApiSuccessResponse<{ invitation: ProjectInvitation }>
	>(`/projects/${projectId}/invitations/${invitationId}/resend`);
	return response.data.data.invitation;
}

/** Withdraws an invitation, leaving the recipient's access untouched. */
export async function cancelProjectInvitation(
	projectId: string,
	invitationId: string,
): Promise<void> {
	await apiClient.delete(`/projects/${projectId}/invitations/${invitationId}`);
}

/**
 * What the link in the recipient's inbox points at.
 *
 * Any signed-in account may ask, which is why the server keeps the answer small:
 * it reports the project name, who sent it and whether the link works, and
 * nothing else. `usable` is false for an account the invitation is not addressed
 * to, and the caller uses that to explain the mismatch instead of offering a
 * button that will be refused.
 */
export async function getInvitationPreview(
	token: string,
	signal?: AbortSignal,
): Promise<InvitationPreview> {
	const response = await apiClient.get<
		ApiSuccessResponse<{ invitation: InvitationPreview }>
	>(`/invitations/${token}`, { signal });
	return response.data.data.invitation;
}

/**
 * Accepts, creating the membership.
 *
 * A POST that the interface must only ever send from an explicit press. A link
 * prefetcher or a scanner that treated this as a read would join people to
 * projects on their behalf, which is why the server refuses to make it a GET.
 */
export async function acceptInvitation(
	token: string,
): Promise<InvitationAcceptance> {
	const response = await apiClient.post<
		ApiSuccessResponse<InvitationAcceptance>
	>(`/invitations/${token}/accept`);
	return response.data.data;
}
