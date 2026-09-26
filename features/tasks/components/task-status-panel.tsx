"use client";

import { SpinnerIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/provider";
import { useUpdateTask } from "@/features/tasks/hooks";
import { getTaskStatusLabel } from "@/features/tasks/labels";
import {
	getStatusTransitions,
	type StatusTransition,
} from "@/features/tasks/permissions";
import type { Task } from "@/features/tasks/types";
import {
	getApiErrorMessage,
	isConcurrentModificationError,
} from "@/lib/api/error";

type TaskStatusPanelProps = {
	task: Task;
};

/**
 * Role-aware status changes.
 *
 * The list of offered transitions comes from {@link getStatusTransitions}, which
 * mirrors the server policy, so a PM is not shown a "Mark done" control for a task
 * assigned to someone else and an internal user is not offered status changes on
 * a task that is not theirs. That is a usability measure only — every request
 * still goes through the API, which re-checks the role, the dependency graph, the
 * state machine, and the version.
 *
 * The version sent with the change comes from the task this component was handed,
 * which is the row TanStack Query last fetched, so a conflict reported by the
 * server is surfaced rather than silently retried.
 */
export function TaskStatusPanel({ task }: TaskStatusPanelProps) {
	const { user } = useAuth();
	const updateTask = useUpdateTask();
	const [conflictNotice, setConflictNotice] = useState<string | null>(null);

	if (!user) {
		return null;
	}

	const transitions = getStatusTransitions(user, task);
	const available = transitions.filter(
		(transition) => transition.blockedReason === null,
	);
	const isPending = updateTask.isPending;
	const errorMessage = updateTask.error
		? getApiErrorMessage(updateTask.error)
		: null;

	function changeStatus(targetStatus: Task["status"]) {
		setConflictNotice(null);
		updateTask.mutate(
			{
				taskId: task.id,
				projectId: task.projectId,
				payload: { status: targetStatus, version: task.version },
			},
			{
				onSuccess: () => setConflictNotice(null),
				onError: (error) => {
					// The hook already refetched on a conflict, so this component is
					// about to be re-rendered with the winning row. Saying so is more
					// useful than a bare "something went wrong".
					setConflictNotice(
						isConcurrentModificationError(error)
							? "This task was updated by another user. The latest version has been loaded. Please review the current status before changing it again."
							: null,
					);
				},
			},
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Status</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<p className="text-sm text-muted-foreground">
					{`This task is currently ${getTaskStatusLabel(task.status).toLowerCase()}.`}
				</p>

				{transitions.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						There is no other status to move to.
					</p>
				) : (
					<ul className="flex flex-wrap gap-2">
						{transitions.map((transition: StatusTransition) => (
							<li key={transition.targetStatus}>
								<Button
									className="min-h-9"
									disabled={isPending || transition.blockedReason !== null}
									size="sm"
									type="button"
									variant="outline"
									title={
										transition.blockedReason ??
										`Move to ${getTaskStatusLabel(transition.targetStatus)}`
									}
									onClick={() => changeStatus(transition.targetStatus)}
								>
									{isPending ? (
										<SpinnerIcon aria-hidden="true" className="animate-spin" />
									) : null}
									{`Move to ${getTaskStatusLabel(transition.targetStatus)}`}
								</Button>
							</li>
						))}
					</ul>
				)}

				{/* A closed transition still has to explain itself, otherwise a
				    disabled control reads as a rendering bug rather than a rule. */}
				{transitions.some((item) => item.blockedReason !== null) ? (
					<ul className="flex flex-col gap-1 text-xs text-muted-foreground">
						{transitions
							.filter((item) => item.blockedReason !== null)
							.map((item) => (
								<li key={item.blockedReason}>
									{`${getTaskStatusLabel(item.targetStatus)}: ${item.blockedReason}`}
								</li>
							))}
					</ul>
				) : null}

				{conflictNotice !== null ? (
					<p className="text-sm text-destructive" role="alert">
						{conflictNotice}
					</p>
				) : null}
				{errorMessage !== null && conflictNotice === null ? (
					<p className="text-sm text-destructive" role="alert">
						{errorMessage}
					</p>
				) : null}
				{available.length === 0 && transitions.length > 0 ? (
					<p className="text-sm text-muted-foreground">
						You cannot change this task&apos;s status.
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
