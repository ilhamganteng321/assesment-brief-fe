"use client";

import { ProhibitIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getTaskStatusLabel } from "@/features/tasks/labels";
import type { Task } from "@/features/tasks/types";

type ProjectBlockedTasksProps = {
	tasks: readonly Task[];
	pending?: boolean;
	error?: unknown;
	onRetry?: () => void;
	/** Exact count from the project metrics, for the heading. */
	totalFromServer?: number;
	limit?: number;
};

/**
 * The project's blocked tasks, with the reason each one is stuck.
 *
 * The list is fetched through the server's `isBlocked` filter rather than by
 * scanning a page of tasks in the browser, so it is the real set of blocked tasks
 * and not "whichever ones happened to be on the page". Both the blocked flag and
 * the prerequisite list come from the task payload the API already computed, so
 * this panel re-derives nothing: it cannot disagree with the board about which
 * tasks are blocked, and it never walks the dependency graph itself.
 */
export function ProjectBlockedTasks({
	tasks,
	pending,
	error,
	onRetry,
	totalFromServer,
	limit = 5,
}: ProjectBlockedTasksProps) {
	const shown = tasks.slice(0, limit);
	const count = totalFromServer ?? tasks.length;

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{count > 0 ? `Blocked tasks (${String(count)})` : "Blocked tasks"}
				</CardTitle>
			</CardHeader>
			<CardContent aria-busy={pending === true}>
				{pending ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				) : error !== undefined ? (
					<QueryErrorState
						error={error}
						title="Unable to load blocked tasks"
						onRetry={onRetry ?? (() => undefined)}
					/>
				) : tasks.length === 0 ? (
					<EmptyState
						icon={<ProhibitIcon size={22} />}
						title="All clear"
						description="There are currently no blocked tasks."
					/>
				) : (
					<ul className="flex flex-col divide-y">
						{shown.map((task) => (
							<li className="flex flex-col gap-1 py-3" key={task.id}>
								<Link
									className="flex min-h-11 items-center gap-2 rounded-md font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									href={`/tasks/${task.id}`}
								>
									<ProhibitIcon
										aria-hidden="true"
										className="shrink-0 text-destructive"
									/>
									{task.title}
								</Link>
								{blockedReason(task)}
							</li>
						))}
						{tasks.length > shown.length ? (
							<li className="pt-3 text-xs text-muted-foreground">
								{`and ${String(tasks.length - shown.length)} more`}
							</li>
						) : null}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * "Waiting for" lines for a blocked task.
 *
 * A deleted prerequisite is called out separately: the dependency row survives a
 * soft delete, so the task stays blocked by something nobody can open, and
 * saying "deleted" is more honest than rendering a link to a 404.
 */
function blockedReason(task: Task) {
	if (task.blockedBy.length === 0) {
		return (
			<p className="text-sm text-muted-foreground">
				Waiting on a prerequisite that is no longer listed.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			<p className="text-sm text-muted-foreground">Waiting for:</p>
			<ul className="flex flex-col gap-0.5">
				{task.blockedBy.map((blocker) => (
					<li className="text-sm" key={blocker.id}>
						{blocker.deleted ? (
							<span className="text-muted-foreground">
								<span className="line-through">{blocker.title}</span> (deleted)
							</span>
						) : (
							<span>
								<Link
									className="hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									href={`/tasks/${blocker.id}`}
								>
									{blocker.title}
								</Link>
								<span className="text-muted-foreground">
									{` — ${getTaskStatusLabel(blocker.status)}`}
								</span>
							</span>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
