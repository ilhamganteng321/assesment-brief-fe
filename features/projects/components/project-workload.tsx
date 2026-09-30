import { UsersIcon } from "@phosphor-icons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getTaskDepartmentLabel } from "@/features/tasks/labels";

import type { ProjectWorkloadEntry } from "../types";

/**
 * Who is carrying this project's open work.
 *
 * The rows come from the server's `workload` split, which counts in the database.
 * The tempting alternative — grouping a page of tasks in the browser — would need
 * every task in the project, and the project page is not the place to download one
 * to draw a list of five names. The counts also cannot drift from the rest of the
 * dashboard for the same reason the department breakdown does not: there is one
 * implementation of the number.
 *
 * Only unfinished tasks are counted, so a person with nothing open does not appear
 * at all rather than appearing with a zero — which means this card cannot be used
 * to enumerate the project's roster. That is also why it is internal-only by
 * construction: it names people, and the client metrics payload carries no such
 * field.
 *
 * The unassigned row is rendered like any other, because it is the one a project
 * manager most wants to see and giving it a different shape would mean two layouts
 * for one list.
 */
export function ProjectWorkload({
	rows,
	pending,
}: {
	rows: readonly ProjectWorkloadEntry[];
	pending?: boolean;
}) {
	const busiest = rows.reduce(
		(highest, row) => Math.max(highest, row.openTaskCount),
		0,
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="inline-flex items-center gap-2">
					<UsersIcon aria-hidden="true" />
					Workload
				</CardTitle>
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
						className="border-0 bg-transparent px-0 py-6"
						title="Nothing in progress"
						description="When this project has unfinished work, it is split out here by person."
					/>
				) : (
					<ul className="flex flex-col gap-3">
						{rows.map((row) => {
							const key = row.userId ?? "unassigned";
							// Proportional to the busiest person rather than to the total,
							// so the bar answers "who is carrying the most" even on a small
							// project where every count is one. Guarded against a zero
							// busiest value so an empty list cannot divide by nothing.
							const share =
								busiest === 0
									? 0
									: Math.round((row.openTaskCount / busiest) * 100);

							return (
								<li className="flex flex-col gap-1" key={key}>
									<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
										<span className="font-medium">
											{row.name}
											{row.department ? (
												<span className="ml-2 text-xs text-muted-foreground">
													{getTaskDepartmentLabel(row.department)}
												</span>
											) : null}
										</span>
										<span className="text-muted-foreground">
											{`${String(row.openTaskCount)} open ${row.openTaskCount === 1 ? "task" : "tasks"}`}
										</span>
									</div>
									<div
										aria-label={`${row.name}: ${String(row.openTaskCount)} open ${
											row.openTaskCount === 1 ? "task" : "tasks"
										}`}
										aria-valuemax={busiest}
										aria-valuemin={0}
										aria-valuenow={row.openTaskCount}
										className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
										role="progressbar"
									>
										<div
											className="h-full rounded-full bg-primary transition-[width]"
											style={{ width: `${String(share)}%` }}
										/>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
