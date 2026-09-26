"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getTaskDepartmentLabel } from "@/features/tasks/labels";

import type { ProjectDepartmentMetrics } from "../types";

/**
 * Progress per task-owning department.
 *
 * The rows and their percentages come from the server's `byDepartment` breakdown,
 * which reconciles exactly with the project totals. Nothing is grouped or averaged
 * here: doing that in the browser would be a second, disagreeing definition of
 * progress.
 *
 * This section is internal-only by construction. The client metrics endpoint does
 * not carry a department breakdown at all, so a client guest has no such numbers
 * to render, and the department labels here are internal team names.
 */
export function DepartmentProgress({
	rows,
	pending,
}: {
	rows: readonly ProjectDepartmentMetrics[];
	pending?: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Department progress</CardTitle>
			</CardHeader>
			<CardContent aria-busy={pending === true}>
				{pending ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				) : rows.length === 0 ? (
					<EmptyState
						title="No tasks to attribute"
						description="Once this project has tasks, each owning department reports its own progress here."
					/>
				) : (
					<ul className="flex flex-col gap-3">
						{rows.map((row) => (
							<li className="flex flex-col gap-1" key={row.department}>
								<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
									<span className="font-medium">
										{getTaskDepartmentLabel(row.department)}
									</span>
									<span className="text-muted-foreground">
										{`${String(row.progressPercentage)}% · ${String(
											row.completed,
										)} of ${String(row.total)} done${
											row.blocked > 0 ? ` · ${String(row.blocked)} blocked` : ""
										}`}
									</span>
								</div>
								<div
									aria-label={`${getTaskDepartmentLabel(row.department)}: ${String(
										row.progressPercentage,
									)}% complete`}
									aria-valuemax={100}
									aria-valuemin={0}
									aria-valuenow={row.progressPercentage}
									className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
									role="progressbar"
								>
									<div
										className="h-full rounded-full bg-primary transition-[width]"
										style={{ width: `${String(row.progressPercentage)}%` }}
									/>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
