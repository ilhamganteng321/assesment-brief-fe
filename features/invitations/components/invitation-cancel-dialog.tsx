"use client";

import { Button } from "@/components/ui/button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogRoot,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/provider";
import { getApiErrorMessage } from "@/lib/api/error";

import { useCancelProjectInvitation } from "../hooks";
import type { ProjectInvitation } from "../types";

/**
 * Confirms withdrawing an invitation.
 *
 * A prompt rather than a one-click button, for the same reason removing a member
 * has one: the thing being taken away is somebody's way into a project. Here it is
 * only the *link* that goes — the membership never existed, so nothing has to be
 * undone — but the recipient is waiting on that email, and losing it silently
 * because of a stray click is a bad way to find out.
 *
 * The wording says the address, because the two rows in a list of invitations look
 * alike and a person confirming a destructive action needs to know which one they
 * are confirming.
 */
export function InvitationCancelDialog({
	invitation,
	open,
	onOpenChange,
	onCanceled,
}: {
	invitation: ProjectInvitation;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCanceled?: (invitationId: string) => void;
}) {
	const { user } = useAuth();
	const cancelInvitation = useCancelProjectInvitation(user?.role);
	const errorMessage = cancelInvitation.error
		? getApiErrorMessage(cancelInvitation.error)
		: null;

	async function handleConfirm() {
		try {
			await cancelInvitation.mutateAsync({
				projectId: invitation.projectId,
				invitationId: invitation.id,
			});
			onCanceled?.(invitation.id);
			onOpenChange(false);
		} catch {
			// Rendered below, with the dialog still open so the person can decide
			// what to do rather than discovering the failure after it closed.
			return;
		}
	}

	return (
		<DialogRoot onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Withdraw invitation</DialogTitle>
					<DialogDescription>
						{`Withdraw the invitation to ${invitation.email}? The link will stop working. If you change your mind you can send a new one, and nothing is added to the project until the recipient accepts.`}
					</DialogDescription>
				</DialogHeader>

				{errorMessage ? (
					<p className="text-sm text-destructive" role="alert">
						{errorMessage}
					</p>
				) : null}

				<DialogFooter>
					<Button
						disabled={cancelInvitation.isPending}
						render={<DialogClose />}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={cancelInvitation.isPending}
						type="button"
						variant="destructive"
						onClick={() => void handleConfirm()}
					>
						{cancelInvitation.isPending
							? "Withdrawing..."
							: "Withdraw invitation"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</DialogRoot>
	);
}
