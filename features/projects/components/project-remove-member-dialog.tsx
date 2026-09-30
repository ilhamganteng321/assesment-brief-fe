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

import { useRemoveProjectMember } from "../hooks";
import type { ProjectMember } from "../types";

/**
 * Confirms removing somebody from a project.
 *
 * Membership is the grant that opens a project, so removing it is not a cosmetic
 * edit: on the next request the person loses access to the project, its tasks and
 * its activity. That is worth a prompt, and it is why this is the application's
 * own dialog rather than a one-click button — a single stray click would lock
 * somebody out of work they are mid-way through.
 *
 * The wording says what actually happens rather than only that the row is
 * removed, because "remove member" reads like tidying a list.
 */
export function ProjectRemoveMemberDialog({
	member,
	open,
	onOpenChange,
	onRemoved,
}: {
	member: ProjectMember;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called with the user that was removed, so a list can be refetched. */
	onRemoved?: (userId: string) => void;
}) {
	const { user } = useAuth();
	const removeMember = useRemoveProjectMember(user?.role);
	const errorMessage = removeMember.error
		? getApiErrorMessage(removeMember.error)
		: null;

	async function handleConfirm() {
		try {
			await removeMember.mutateAsync({
				projectId: member.projectId,
				userId: member.userId,
			});
			onRemoved?.(member.userId);
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
					<DialogTitle>Remove member</DialogTitle>
					<DialogDescription>
						{`Remove ${member.user.name} from this project? This will remove their access to the project and its tasks. Their account is not affected, and they can be added back later.`}
					</DialogDescription>
				</DialogHeader>

				{errorMessage ? (
					<p className="text-sm text-destructive" role="alert">
						{errorMessage}
					</p>
				) : null}

				<DialogFooter>
					<Button
						disabled={removeMember.isPending}
						render={<DialogClose />}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={removeMember.isPending}
						type="button"
						variant="destructive"
						onClick={handleConfirm}
					>
						{removeMember.isPending ? "Removing..." : "Remove member"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</DialogRoot>
	);
}
