"use client";

import {
	EnvelopeSimpleIcon,
	PaperPlaneTiltIcon,
	ProhibitIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/provider";
import type { Project } from "@/features/projects/types";
import { getApiErrorMessage } from "@/lib/api/error";

import { useProjectInvitations, useResendProjectInvitation } from "../hooks";
import {
	formatInvitationDate,
	getInvitationStatusLabel,
	getInvitationTimeRemaining,
} from "../labels";
import {
	canCancelInvitation,
	canManageProjectInvitationsNow,
} from "../permissions";
import type { ProjectInvitation } from "../types";
import { InvitationCancelDialog } from "./invitation-cancel-dialog";
import { InvitationCreateDialog } from "./invitation-create-dialog";

/**
 * Who has been invited to this project, and what became of it.
 *
 * A separate card from the member roster on purpose. The two lists answer different
 * questions — "who is on this project" and "who did I email about it" — and merging
 * them would mean a pending invitation occupying a row in a roster that is
 * otherwise a statement about access. Somebody who has not accepted is not a
 * member, and a roster that listed them would be lying.
 *
 * History is kept rather than filtered to what is pending. "Sent on Tuesday, never
 * opened" is the sort of thing a project manager needs to be able to see, and a
 * list that quietly dropped its own history could not answer it. The status shown
 * is the server's, including the derived EXPIRED: this component does not decide
 * whether a link still works, because only the server knows the expiry it issued.
 */
export function ProjectInvitationsSection({
	project,
	id,
	className,
}: {
	project: Pick<Project, "id" | "name" | "status">;
	/** Anchor target, so the project tab strip can jump to this section. */
	id?: string;
	className?: string;
}) {
	const { user } = useAuth();
	const role = user?.role;
	const invitationsQuery = useProjectInvitations(role, project.id);
	const resendInvitation = useResendProjectInvitation(role);
	const [createOpen, setCreateOpen] = useState(false);
	const [cancelTarget, setCancelTarget] = useState<ProjectInvitation | null>(
		null,
	);

	const invitations = invitationsQuery.data ?? [];
	const canManage = canManageProjectInvitationsNow({ role }, project);
	// The mutation's own variables name the row in flight, so a second resend
	// cannot leave the interface showing two pending rows and only one of them
	// actually sending.
	const resendingId = resendInvitation.isPending
		? resendInvitation.variables?.invitationId
		: undefined;

	async function handleResend(invitation: ProjectInvitation) {
		try {
			await resendInvitation.mutateAsync({
				projectId: invitation.projectId,
				invitationId: invitation.id,
			});
		} catch {
			// Rendered above the list, with the row left as it was, so the person can
			// retry the same resend rather than having to find the row again.
			return;
		}
	}

	return (
		<Card className={className} id={id}>
			<CardHeader>
				<CardTitle className="inline-flex items-center gap-2">
					<EnvelopeSimpleIcon aria-hidden="true" />
					Invitations
					{invitationsQuery.isPending ? null : (
						<span className="text-sm font-normal text-muted-foreground">
							{invitations.length === 1
								? "1 sent"
								: `${String(invitations.length)} sent`}
						</span>
					)}
				</CardTitle>
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				{canManage ? (
					<div className="flex justify-end">
						<Button
							className="min-h-9 shrink-0"
							type="button"
							onClick={() => setCreateOpen(true)}
						>
							<EnvelopeSimpleIcon aria-hidden="true" />
							Invite by email
						</Button>
					</div>
				) : null}

				{resendInvitation.error ? (
					<p className="text-sm text-destructive" role="alert">
						{getApiErrorMessage(resendInvitation.error)}
					</p>
				) : null}

				<InvitationList
					canManage={canManage}
					error={invitationsQuery.isError ? invitationsQuery.error : undefined}
					invitations={invitations}
					isLoading={invitationsQuery.isPending}
					resendingId={resendingId}
					onCancel={setCancelTarget}
					onRetry={() => void invitationsQuery.refetch()}
					onResend={(invitation) => void handleResend(invitation)}
				/>
			</CardContent>

			{createOpen ? (
				<InvitationCreateDialog
					onOpenChange={setCreateOpen}
					open
					project={project}
				/>
			) : null}

			{cancelTarget ? (
				<InvitationCancelDialog
					invitation={cancelTarget}
					onOpenChange={(nextOpen) => {
						if (!nextOpen) {
							setCancelTarget(null);
						}
					}}
					open
				/>
			) : null}
		</Card>
	);
}

function InvitationList({
	invitations,
	isLoading,
	error,
	canManage,
	resendingId,
	onResend,
	onCancel,
	onRetry,
}: {
	invitations: readonly ProjectInvitation[];
	isLoading: boolean;
	error?: unknown;
	canManage: boolean;
	resendingId?: string;
	onResend: (invitation: ProjectInvitation) => void;
	onCancel: (invitation: ProjectInvitation) => void;
	onRetry: () => void;
}) {
	if (isLoading) {
		return (
			<div
				aria-busy="true"
				aria-label="Loading invitations"
				className="flex flex-col gap-3"
				role="status"
			>
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<span className="sr-only">Loading invitations...</span>
			</div>
		);
	}

	if (error !== undefined) {
		return (
			<QueryErrorState
				error={error}
				title="Unable to load invitations"
				onRetry={onRetry}
			/>
		);
	}

	if (invitations.length === 0) {
		return (
			<EmptyState
				className="border-0 bg-transparent px-0 py-6"
				icon={<EnvelopeSimpleIcon size={20} />}
				title="No invitations sent"
				description={
					canManage
						? "Invite somebody by email. They join only after signing in as that address and accepting the link."
						: "Nobody has been invited to this project by email."
				}
			/>
		);
	}

	return (
		<ul className="flex flex-col divide-y">
			{invitations.map((invitation) => (
				<InvitationRow
					canManage={canManage}
					invitation={invitation}
					isResending={resendingId === invitation.id}
					key={invitation.id}
					onCancel={() => onCancel(invitation)}
					onResend={() => onResend(invitation)}
				/>
			))}
		</ul>
	);
}

/**
 * One invitation.
 *
 * The status is a word rather than a colour, and the row says who sent it and when
 * it stops working, because the two questions a project manager arrives with are
 * "did that go out" and "is it still any use". A pending row states its own
 * countdown, which is also what tells them that a resend is worth doing.
 */
function InvitationRow({
	invitation,
	canManage,
	isResending,
	onResend,
	onCancel,
}: {
	invitation: ProjectInvitation;
	canManage: boolean;
	isResending: boolean;
	onResend: () => void;
	onCancel: () => void;
}) {
	const remaining = getInvitationTimeRemaining(invitation.expiresAt);
	const actionable = canManage && canCancelInvitation(invitation.status);

	return (
		<li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-sm font-medium">{invitation.email}</span>
				<span className="truncate text-xs text-muted-foreground">
					{`Invited by ${invitation.invitedBy.name} on ${formatInvitationDate(
						invitation.createdAt,
					)}`}
				</span>
			</span>

			<span className="flex shrink-0 flex-col items-end">
				<span className="text-xs font-medium">
					{getInvitationStatusLabel(invitation.status)}
				</span>
				{invitation.status === "PENDING" ? (
					<span className="text-xs text-muted-foreground">
						{remaining.label}
					</span>
				) : invitation.status === "ACCEPTED" ? (
					<span className="text-xs text-muted-foreground">
						{`Accepted ${formatInvitationDate(invitation.acceptedAt)}`}
					</span>
				) : (
					<span className="text-xs text-muted-foreground">
						{`Expired ${formatInvitationDate(invitation.expiresAt)}`}
					</span>
				)}
			</span>

			{actionable ? (
				<span className="flex shrink-0 gap-1">
					<Button
						aria-label={`Resend the invitation to ${invitation.email}`}
						disabled={isResending}
						size="sm"
						type="button"
						variant="outline"
						onClick={onResend}
					>
						<PaperPlaneTiltIcon aria-hidden="true" />
						{isResending ? "Sending..." : "Resend"}
					</Button>
					<Button
						aria-label={`Withdraw the invitation to ${invitation.email}`}
						size="sm"
						type="button"
						variant="ghost"
						onClick={onCancel}
					>
						<ProhibitIcon aria-hidden="true" />
						Withdraw
					</Button>
				</span>
			) : null}
		</li>
	);
}
