"use client";

import { CheckCircleIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/provider";
import { getAuthPageHref } from "@/features/auth/redirects";
import { getApiErrorMessage, normalizeApiError } from "@/lib/api/error";

import { useAcceptInvitation, useInvitationPreview } from "../hooks";
import { formatInvitationDate, getInvitationStatusLabel } from "../labels";
import { canAcceptInvitation } from "../permissions";
import type { InvitationPreview } from "../types";

/**
 * The page an emailed invitation link opens.
 *
 * Three things make it different from every other screen in the product, and all
 * three follow from the fact that the person arriving here may have no account.
 *
 * It is inside the authenticated layout, so the token survives a detour through
 * sign-in or registration. That is done with the ordinary `?redirect=` mechanism
 * rather than anything stored: the token stays in the URL, is validated as an
 * internal path on the way through, and is gone the moment the page replaces it.
 * Nothing persists it, which is what makes "close the tab and the link is still
 * only in the inbox" true.
 *
 * It renders the *server's* answer rather than deciding anything. Whether the
 * invitation is still usable depends on three things the browser cannot know — the
 * expiry the server issued, whether the project is still joinable, and whether
 * this account is the one the invitation names — so the page asks, and is told
 * `usable`. A locally computed "is this pending?" would be right most of the time
 * and confidently wrong the rest.
 *
 * And the accept button is never rendered without that answer, because a link
 * prefetcher or a browser that fires it speculatively would join people to projects
 * on their behalf. It is a POST on the server for the same reason.
 */
export function InvitationAcceptSection({
	token,
}: {
	token: string | undefined;
}) {
	const { user } = useAuth();
	const previewQuery = useInvitationPreview(token, Boolean(user));
	const accept = useAcceptInvitation();
	const [accepted, setAccepted] = useState<{
		projectId: string;
		projectName: string;
	} | null>(null);

	if (user === null) {
		// The layout does not render children without a session, so this is a guard
		// rather than a state anybody should see. The link below is here so the
		// branch is recoverable if it ever is reached.
		return (
			<Card className="mx-auto max-w-lg">
				<CardHeader>
					<CardTitle>Sign in to accept</CardTitle>
					<CardDescription>
						You need an account to accept this invitation.
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<ButtonLink href={getAuthPageHref("login")}>Go to sign in</ButtonLink>
				</CardFooter>
			</Card>
		);
	}

	if (accepted !== null) {
		return <Accepted invitation={accepted} />;
	}

	if (token === undefined || token.length === 0) {
		return <InvalidLink />;
	}

	if (previewQuery.isPending) {
		return (
			<Card className="mx-auto max-w-lg">
				<CardHeader>
					<CardTitle>Checking your invitation</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<Skeleton className="h-5 w-3/4" />
					<Skeleton className="h-4 w-1/2" />
					<Skeleton className="h-10 w-full" />
					<span className="sr-only">Loading your invitation...</span>
				</CardContent>
			</Card>
		);
	}

	if (previewQuery.isError) {
		return (
			<PreviewError
				error={previewQuery.error}
				onRetry={() => void previewQuery.refetch()}
			/>
		);
	}

	const preview = previewQuery.data;
	if (!preview) {
		return <InvalidLink />;
	}

	return (
		<Card className="mx-auto max-w-lg">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<EnvelopeSimpleIcon aria-hidden="true" />
					You have been invited to a project
				</CardTitle>
				<CardDescription>
					{`${preview.invitedBy.name} invited you to join ${preview.project.name}.`}
				</CardDescription>
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				<dl className="grid gap-2 text-sm">
					<div className="flex justify-between gap-4">
						<dt className="text-muted-foreground">Project</dt>
						<dd className="font-medium">{preview.project.name}</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt className="text-muted-foreground">Invited by</dt>
						<dd className="font-medium">{preview.invitedBy.name}</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt className="text-muted-foreground">Invited address</dt>
						<dd className="font-medium">{preview.email}</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt className="text-muted-foreground">Status</dt>
						<dd className="font-medium">
							{getInvitationStatusLabel(preview.status)}
						</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt className="text-muted-foreground">Link expires</dt>
						<dd className="font-medium">
							{formatInvitationDate(preview.expiresAt)}
						</dd>
					</div>
				</dl>

				{/* The explanation is shown instead of the button, never alongside it,
				    so there is never a control on screen that the server has already
				    said will be refused. */}
				<AcceptanceExplanation preview={preview} signedInEmail={user.email} />

				{accept.error ? (
					<p className="text-sm text-destructive" role="alert">
						{getAcceptanceErrorMessage(accept.error, preview.email)}
					</p>
				) : null}
			</CardContent>

			{canAcceptInvitation(preview.usable) ? (
				<CardFooter className="flex gap-2">
					<Button
						disabled={accept.isPending}
						type="button"
						onClick={async () => {
							try {
								const result = await accept.mutateAsync(token);
								setAccepted({
									projectId: result.project.id,
									projectName: result.project.name,
								});
							} catch {
								// Shown above with the page intact, so the person can read
								// what the server said and decide. A refusal here is
								// usually real: the link expired, or somebody accepted
								// it already.
								return;
							}
						}}
					>
						{accept.isPending ? "Joining..." : "Accept invitation"}
					</Button>
					<ButtonLink href="/dashboard" variant="outline">
						Not now
					</ButtonLink>
				</CardFooter>
			) : null}
		</Card>
	);
}

/**
 * Why there is no button, in the words the situation calls for.
 *
 * Kept next to the button decision rather than folded into it, because "this
 * invitation is expired" and "this invitation is addressed to somebody else" send
 * the person somewhere completely different — the first to ask for a new link, the
 * second to sign in as the right account.
 */
function AcceptanceExplanation({
	preview,
	signedInEmail,
}: {
	preview: InvitationPreview;
	signedInEmail: string;
}) {
	if (preview.usable) {
		return (
			<p className="text-sm text-muted-foreground">
				Accepting adds you to the project. Nothing changes until you do.
			</p>
		);
	}

	const isForThisAccount =
		preview.email.toLowerCase() === signedInEmail.toLowerCase();

	if (!isForThisAccount) {
		return (
			<div className="rounded-md border bg-muted/40 p-3 text-sm">
				<p>
					{`This invitation was sent to ${preview.email}, and you are signed in as ${signedInEmail}.`}
				</p>
				<p className="mt-2">
					<Link
						className="underline"
						href={getAuthPageHref("login", "/invitations/accept")}
					>
						Sign in as {preview.email}
					</Link>{" "}
					to accept it.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border bg-muted/40 p-3 text-sm">
			<p>
				{preview.status === "EXPIRED"
					? "This invitation has expired, so the link no longer works. Ask whoever invited you to send a new one."
					: preview.status === "CANCELED"
						? "This invitation was withdrawn by whoever sent it."
						: preview.status === "ACCEPTED"
							? "This invitation has already been accepted."
							: "This invitation can no longer be accepted."}
			</p>
		</div>
	);
}

function Accepted({
	invitation,
}: {
	invitation: { projectId: string; projectName: string };
}) {
	return (
		<Card className="mx-auto max-w-lg">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CheckCircleIcon aria-hidden="true" weight="fill" />
					You have joined {invitation.projectName}
				</CardTitle>
				<CardDescription>
					Your account is now a member of the project, with the same access any
					other member has.
				</CardDescription>
			</CardHeader>
			<CardFooter className="flex gap-2">
				<ButtonLink href={`/projects/${invitation.projectId}`}>
					Open the project
				</ButtonLink>
				<ButtonLink href="/dashboard" variant="outline">
					Go to dashboard
				</ButtonLink>
			</CardFooter>
		</Card>
	);
}

function InvalidLink() {
	return (
		<Card className="mx-auto max-w-lg">
			<CardHeader>
				<CardTitle>This invitation link is incomplete</CardTitle>
				<CardDescription>
					The address in the link is not a valid invitation. Open the link
					exactly as it appears in the email, or ask for a new one.
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<ButtonLink href="/dashboard" variant="outline">
					Go to the dashboard
				</ButtonLink>
			</CardFooter>
		</Card>
	);
}

function PreviewError({
	error,
	onRetry,
}: {
	error: unknown;
	onRetry: () => void;
}) {
	const code = normalizeApiError(error).code;

	if (code === "INVITATION_NOT_FOUND") {
		// The same answer the server gives for a token that was never issued, because
		// from the page's point of view they are the same thing. Not distinguishing
		// them is what stops this screen from confirming that a guessed link is real.
		return <InvalidLink />;
	}

	return (
		<QueryErrorState
			error={error}
			title="Unable to check this invitation"
			onRetry={onRetry}
		/>
	);
}

/**
 * The message for a refused acceptance.
 *
 * Several of these are cases where the preview said it would work and the write
 * disagreed — the link lapsed in the second between the two requests, or somebody
 * accepted it from another tab. Each gets its own wording, because "something went
 * wrong" on the one action a person took to join a project is the least useful
 * thing this page could say.
 */
export function getAcceptanceErrorMessage(
	error: unknown,
	invitedEmail: string,
): string {
	const apiError = normalizeApiError(error);

	switch (apiError.code) {
		case "INVITATION_ALREADY_ACCEPTED":
			return "This invitation has already been accepted.";
		case "INVITATION_EXPIRED":
			return "This link has expired. Ask whoever invited you to send a new one.";
		case "INVITATION_CANCELED":
			return "This invitation was withdrawn by whoever sent it.";
		case "INVITATION_ALREADY_MEMBER":
			return "You are already a member of this project.";
		case "INVITATION_EMAIL_MISMATCH":
			return `This invitation was sent to ${invitedEmail}. Sign in as that address to accept it.`;
		case "INVITATION_PROJECT_UNAVAILABLE":
			return apiError.details?.projectStatus === "DELETED"
				? "The project this invitation refers to no longer exists."
				: "The project this invitation refers to is archived and can no longer be joined.";
		case "INVITATION_NOT_FOUND":
			return "This invitation link is no longer valid.";
		default:
			return getApiErrorMessage(error);
	}
}
