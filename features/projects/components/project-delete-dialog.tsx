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
import type { UserRole } from "@/features/auth/types";
import { getApiErrorMessage } from "@/lib/api/error";

import { useDeleteProject } from "../hooks";
import type { Project } from "../types";

/**
 * Confirms a soft delete.
 *
 * Named for what it does rather than for how it reads beside the ARCHIVED
 * lifecycle state, which is a different thing entirely: archiving keeps a
 * project readable and merely read-only, while this hides it from every list and
 * closes it to all further changes.
 *
 * The wording is explicit about the row surviving, because "delete" in a
 * confirmation is otherwise read as irreversible and the guarantee is the whole
 * point of asking.
 */
export function ProjectDeleteDialog({
	role,
	open,
	onOpenChange,
	project,
	onDeleted,
}: {
	role: UserRole | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	project: Project;
	/** Called after a successful delete, with the project that was removed. */
	onDeleted?: (project: Project) => void;
}) {
	const deleteProject = useDeleteProject(role);
	const errorMessage = deleteProject.error
		? getApiErrorMessage(deleteProject.error)
		: null;

	async function handleConfirm() {
		try {
			await deleteProject.mutateAsync(project.id);
			onDeleted?.(project);
			onOpenChange(false);
		} catch {
			return;
		}
	}

	return (
		<DialogRoot onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{`Delete ${project.name}?`}</DialogTitle>
					<DialogDescription>
						This removes the project from your lists and stops anyone opening
						it. The project record, its tasks and its history are kept, not
						erased.
					</DialogDescription>
				</DialogHeader>
				{errorMessage ? (
					<p className="text-sm text-destructive" role="alert">
						{errorMessage}
					</p>
				) : null}
				<DialogFooter>
					<Button
						disabled={deleteProject.isPending}
						render={<DialogClose />}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={deleteProject.isPending}
						type="button"
						variant="destructive"
						onClick={handleConfirm}
					>
						{deleteProject.isPending ? "Deleting..." : "Delete project"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</DialogRoot>
	);
}
