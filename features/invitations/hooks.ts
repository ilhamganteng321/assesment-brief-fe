import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { UserRole } from "@/features/auth/types";
import { projectKeys } from "@/features/projects/hooks";

import {
	acceptInvitation,
	cancelProjectInvitation,
	createProjectInvitation,
	getInvitationPreview,
	listProjectInvitations,
	resendProjectInvitation,
} from "./api";
import { canManageProjectInvitations } from "./permissions";
import type { CreateInvitationPayload } from "./types";

/**
 * Query keys for the invitation feature.
 *
 * A separate root from `projectKeys` rather than a sub-key of it, because two of
 * these queries are keyed on a *token* and have no project in the key at all. A
 * token-keyed entry nested under a project would be a lie the moment the same
 * token is opened without one.
 *
 * The project-scoped list does hang off the project prefix, because it is
 * invalidated together with the members and the project row.
 */
export const invitationKeys = {
	all: ["invitations"] as const,
	preview: (token: string) =>
		[...invitationKeys.all, "preview", token] as const,
	projectLists: () => [...invitationKeys.all, "project-list"] as const,
	projectList: (projectId: string) =>
		[...invitationKeys.projectLists(), projectId] as const,
};

/** A 43-character base64url token, the shape the server issues. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/**
 * Whether a value from the URL is shaped like a token.
 *
 * Checked before the query is attempted so a mistyped or truncated link does not
 * become a request the server will only refuse. It says nothing about validity —
 * that is the server's answer — it just avoids spending a round trip on a value
 * that cannot possibly be one of ours.
 */
export function isInvitationToken(value: string | undefined): value is string {
	return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/**
 * A project's invitations, for the project manager who sent them.
 *
 * Disabled outright for a role that could not act on the answer, rather than being
 * attempted and refused: the server would answer 403 either way, but not asking
 * means an internal engineer's browser never enters an error state on a page they
 * are only reading.
 */
export function useProjectInvitations(
	role: UserRole | undefined,
	projectId: string,
) {
	return useQuery({
		queryKey: invitationKeys.projectList(projectId),
		queryFn: async ({ signal }) => listProjectInvitations(projectId, signal),
		enabled:
			canManageProjectInvitations({ role }) &&
			projectId.length > 0 &&
			role !== "CLIENT",
	});
}

/**
 * What the link in the inbox points at.
 *
 * Keyed on the token, and deliberately short-lived: a preview is a snapshot of one
 * invitation's state at one moment, and the answer changes the instant the
 * recipient presses the button. Caching it would let a second tab keep offering an
 * invitation that has already been accepted.
 */
export function useInvitationPreview(
	token: string | undefined,
	enabled: boolean,
) {
	return useQuery({
		queryKey: invitationKeys.preview(token ?? ""),
		queryFn: async ({ signal }) => getInvitationPreview(token ?? "", signal),
		enabled: enabled && isInvitationToken(token),
		retry: false,
		staleTime: 0,
	});
}

/**
 * Sends an invitation.
 *
 * Invalidates the project's invitation list and nothing else. In particular it does
 * *not* touch the member list: nobody has joined anything yet, and refetching the
 * roster would imply a change that has not happened. The only thing that happened
 * is that a row appeared in the invitations table, so that is what is refetched.
 */
export function useCreateProjectInvitation(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			payload,
		}: {
			projectId: string;
			payload: CreateInvitationPayload;
		}) => {
			assertProjectManager(role);
			return createProjectInvitation(projectId, payload);
		},
		onSuccess: async (_invitation, { projectId }) => {
			await queryClient.invalidateQueries({
				queryKey: invitationKeys.projectList(projectId),
			});
		},
	});
}

/**
 * Reissues a token.
 *
 * The member list is not invalidated here either, and neither is the project list:
 * accepting an invitation is what changes the roster, and that is a different
 * request from a different page. The project list *is* dropped rather than
 * invalidated, because a resend means the previous link is dead and any cached
 * preview of it is worse than no cache at all.
 */
export function useResendProjectInvitation(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			invitationId,
		}: {
			projectId: string;
			invitationId: string;
		}) => {
			assertProjectManager(role);
			return resendProjectInvitation(projectId, invitationId);
		},
		onSuccess: async (_invitation, { projectId }) => {
			queryClient.removeQueries({ queryKey: invitationKeys.projectLists() });
			await queryClient.invalidateQueries({
				queryKey: invitationKeys.projectList(projectId),
			});
		},
	});
}

/**
 * Withdraws an invitation.
 *
 * The same invalidation as a resend: the row's state changed and the link with it,
 * so the list is refetched and every cached preview of the old link is dropped.
 */
export function useCancelProjectInvitation(role: UserRole | undefined) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			projectId,
			invitationId,
		}: {
			projectId: string;
			invitationId: string;
		}) => {
			assertProjectManager(role);
			return cancelProjectInvitation(projectId, invitationId);
		},
		onSuccess: async (_data, { projectId }) => {
			queryClient.removeQueries({ queryKey: invitationKeys.projectLists() });
			await queryClient.invalidateQueries({
				queryKey: invitationKeys.projectList(projectId),
			});
		},
	});
}

/**
 * Accepts an invitation and joins the project.
 *
 * The most consequential invalidation in the feature. Accepting changes what this
 * account can reach — every project-scoped read was previously answered 403 or 404
 * because there was no membership — so the whole project prefix is invalidated
 * rather than patched. Patching would mean knowing which of this account's queries
 * were failing, and the answer is: the project, its members, its metrics, its
 * activity, and the project list it will now appear in.
 */
export function useAcceptInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (token: string) => acceptInvitation(token),
		onSuccess: async () => {
			// Two prefixes, and both are genuinely stale now.
			await Promise.all([
				// The link that was just spent, so nothing keeps offering a button that
				// can no longer work, and the sender's list if there is one in the
				// same session.
				queryClient.invalidateQueries({
					queryKey: invitationKeys.all,
				}),
				// Everything project-scoped, because every one of those reads was
				// previously answered 403 or 404 for want of a membership. The
				// project's own list gains a row as a direct result of this write.
				queryClient.invalidateQueries({ queryKey: projectKeys.all }),
			]);
		},
	});
}

function assertProjectManager(role: UserRole | undefined): void {
	if (role !== "PM") {
		throw new Error("Only project managers can manage project invitations.");
	}
}
