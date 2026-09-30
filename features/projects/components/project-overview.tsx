"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ProgressBar } from "./project-progress";

/**
 * A project's headline figures.
 *
 * Purely presentational, and fed the server's numbers rather than fetching them.
 * The internal overview does not use this panel at all — the project dashboard
 * below it already draws the same aggregates from the metrics query it owns, and
 * rendering them twice would mean either a duplicate request or two components
 * disagreeing about the same figure. This exists for the client guest, whose
 * figures arrive with the scoped client dashboard payload and have no metrics
 * endpoint to ask.
 *
 * That difference is the point: the client payload is built on the server and
 * carries no assignee, department, version or audit trail, so this component has
 * no internal field available to render by accident.
 */
type ProjectCounts = {
	total: number;
	completed: number;
	inProgress: number;
	blocked: number;
};

export function ProjectOverview({
	metrics,
	pending = false,
}: {
	metrics?: { progress: { percentage: number }; tasks: ProjectCounts };
	/** True while the figures have not arrived, so the tiles read as skeletons. */
	pending?: boolean;
}) {
	const resolved = pending ? undefined : metrics;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Overview</CardTitle>
			</CardHeader>
			<CardContent aria-busy={pending === true} className="flex flex-col gap-4">
				<ProgressBar
					label="Overall progress"
					percentage={resolved?.progress.percentage ?? 0}
					pending={pending}
				/>
				<p className="text-sm text-muted-foreground">
					{pending
						? "Loading progress..."
						: resolved === undefined
							? "Progress is unavailable."
							: `${String(resolved.progress.percentage)}% complete — ${String(
									resolved.tasks.completed,
								)} of ${String(resolved.tasks.total)} tasks done.`}
				</p>
				<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{toCounts(resolved?.tasks).map((count) => (
						<div className="rounded-lg border p-3" key={count.label}>
							<dt className="text-xs text-muted-foreground">{count.label}</dt>
							<dd className="font-heading text-lg font-semibold">
								{pending ? <Skeleton className="h-6 w-8" /> : count.value}
							</dd>
						</div>
					))}
				</dl>
			</CardContent>
		</Card>
	);
}

type CountTile = { label: string; value: number };

/**
 * A count of zero is a real answer, but only once the server has given one, so
 * the tiles read as skeletons while the request is in flight rather than
 * claiming a project has no tasks before anyone has asked.
 */
function toCounts(tasks: ProjectCounts | undefined): CountTile[] {
	return [
		{ label: "Total tasks", value: tasks?.total ?? 0 },
		{ label: "Completed", value: tasks?.completed ?? 0 },
		{ label: "In progress", value: tasks?.inProgress ?? 0 },
		{ label: "Blocked", value: tasks?.blocked ?? 0 },
	];
}
