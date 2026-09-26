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
import { useArchiveProject } from "../hooks";
import type { Project } from "../types";

type ProjectArchiveDialogProps = {
	role: UserRole | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	project: Project;
	onArchived?: (project: Project) => void;
};

export function ProjectArchiveDialog({
	role,
	open,
	onOpenChange,
	project,
	onArchived,
}: ProjectArchiveDialogProps) {
	const archiveProject = useArchiveProject(role);
	const errorMessage = archiveProject.error
		? getApiErrorMessage(archiveProject.error)
		: null;

	async function handleConfirm() {
		try {
			await archiveProject.mutateAsync(project.id);
			onArchived?.(project);
			onOpenChange(false);
		} catch {
			return;
		}
	}

	return (
		<DialogRoot onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Archive {project.name}</DialogTitle>
					<DialogDescription>
						Archiving hides the project from lists and the dashboard. The
						project record is retained and can be filtered by its archived
						status.
					</DialogDescription>
				</DialogHeader>
				{errorMessage ? (
					<p className="text-sm text-destructive" role="alert">
						{errorMessage}
					</p>
				) : null}
				<DialogFooter>
					<Button
						disabled={archiveProject.isPending}
						render={<DialogClose />}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={archiveProject.isPending}
						type="button"
						variant="destructive"
						onClick={handleConfirm}
					>
						{archiveProject.isPending ? "Archiving..." : "Archive project"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</DialogRoot>
	);
}
