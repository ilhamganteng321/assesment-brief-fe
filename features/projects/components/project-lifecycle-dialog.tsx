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

import { useProjectMetrics, useUpdateProjectStatus } from "../hooks";
import { getLifecycleActionLabel } from "../labels";
import {
	canTransitionProjectStatus,
	getTaskProgressSummary,
} from "../lifecycle";
import { canChangeProjectStatus } from "../permissions";
import type { Project, ProjectStatus } from "../types";

/**
 * Confirms a lifecycle move before it is sent.
 *
 * Both moves the product offers are significant enough to be worth a prompt: one
 * ends the active work, the other makes the project read-only for good. The
 * dialog is the application's own, rather than a browser `confirm()`, so it is
 * focus-trapped, dismissible with Escape, and readable by a screen reader.
 *
 * The task progress is context, not a gate. It is read from the server's own
 * metrics so a project manager can see what they are about to close, but
 * completing a project never requires every task to be DONE and no task status is
 * changed by the move — the server records the transition it was asked for and
 * leaves the tasks alone. The wording says so, so the prompt is not read as a
 * rule it is quietly breaking.
 */
export function ProjectLifecycleDialog({
	project,
	targetStatus,
	open,
	onOpenChange,
	onCompleted,
}: {
	project: Project;
	targetStatus: ProjectStatus;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called after a successful move, with the project the server returned. */
	onCompleted?: (project: Project) => void;
}) {
	const { user } = useAuth();
	const role = user?.role;
	const updateStatus = useUpdateProjectStatus(role);
	// The counts come from the metrics endpoint the dashboard already uses, so no
	// second request is made for a figure the page may already have cached.
	const metricsQuery = useProjectMetrics(role, project.id);
	const errorMessage = updateStatus.error
		? getApiErrorMessage(updateStatus.error)
		: null;

	const actionLabel = getLifecycleActionLabel(targetStatus);
	const isArchive = targetStatus === "ARCHIVED";
	const progressSummary = getTaskProgressSummary({
		completed: metricsQuery.data?.tasks.completed ?? null,
		total: metricsQuery.data?.tasks.total ?? null,
	});

	// The server decides whether a move is legal; this only stops the interface
	// from offering one it already knows is impossible, such as reopening an
	// archived project.
	const isReachable =
		canChangeProjectStatus({ role }) &&
		canTransitionProjectStatus(project.status, targetStatus);

	async function handleConfirm() {
		try {
			const result = await updateStatus.mutateAsync({
				projectId: project.id,
				payload: { status: targetStatus },
			});
			onCompleted?.(result.project);
			onOpenChange(false);
		} catch {
			// The error is rendered in place below, and the dialog stays open with
			// the project's current state untouched behind it.
			return;
		}
	}

	return (
		<DialogRoot onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{actionLabel}</DialogTitle>
					<DialogDescription>
						{isArchive
							? `This project is completed and will become read-only. Its tasks, metrics and history are all kept, and there is no way to reopen it.`
							: `This will mark ${project.name} as completed. No task will be changed, and the project can still be archived afterwards.`}
					</DialogDescription>
				</DialogHeader>

				{progressSummary !== null ? (
					<p className="text-sm text-muted-foreground">
						Current progress: {progressSummary}.
					</p>
				) : null}

				{errorMessage ? (
					<p className="text-sm text-destructive" role="alert">
						{errorMessage}
					</p>
				) : null}

				<DialogFooter>
					<Button
						disabled={updateStatus.isPending}
						render={<DialogClose />}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={updateStatus.isPending || !isReachable}
						type="button"
						onClick={handleConfirm}
					>
						{updateStatus.isPending ? "Working..." : actionLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</DialogRoot>
	);
}
