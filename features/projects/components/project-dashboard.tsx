"use client";

import { BuildingsIcon, KanbanIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole } from "@/features/auth/types";
import { getStartBlockedReason } from "@/features/tasks/dependency";
import { useTaskList } from "@/features/tasks/hooks";
import { getTaskStatusLabel } from "@/features/tasks/labels";
import type { Task, TaskStatus } from "@/features/tasks/types";

import { useProjectActivity, useProjectMetrics } from "../hooks";
import { DepartmentProgress } from "./department-progress";
import { buildMetricDrilldownHref, toMetricCards } from "./metric-cards";
import { ProjectActivity } from "./project-activity";
import { ProjectBlockedTasks } from "./project-blocked-tasks";
import {
	type MetricTile,
	MetricTiles,
	ProgressBar,
	StatusDistribution,
} from "./project-progress";

/** Rows scanned for the two sections that need real task rows. */
const SECTION_SCAN_ROWS = 100;
/** The blocked list is filtered server-side, so this bounds only the render. */
const BLOCKED_SCAN_ROWS = 100;

type ProjectDashboardProps = {
	projectId: string;
	role: UserRole | undefined;
	/** The signed-in user's id, used to scope "My tasks" server-side. */
	currentUserId: string | undefined;
	/**
	 * Where the "create a task" call to action points. It is a link rather than a
	 * second dialog so there is only one create path on the page to keep
	 * permission-correct. Omitted for anyone the backend would refuse.
	 */
	onCreateTaskHref?: string;
};

/**
 * The project dashboard.
 *
 * Every number comes from the server: `/metrics` supplies the counts, the progress
 * percentage, and the per-department breakdown, and the task list supplies the rows
 * behind the blocked and "my tasks" sections. Nothing is totalled in the browser,
 * because a total the client computes is a business rule the client invented and it
 * would disagree with the API the moment the page size or a filter changed.
 *
 * Each section loads and fails on its own. A failed metrics call leaves the
 * activity feed and the blocked list readable rather than blanking the page, and a
 * failed activity call does not take the numbers down with it.
 */
export function ProjectDashboard({
	projectId,
	role,
	currentUserId,
	onCreateTaskHref,
}: ProjectDashboardProps) {
	const isInternal = role === "INTERNAL";
	const canCreate = role === "PM" && onCreateTaskHref !== undefined;
	const metricsQuery = useProjectMetrics(role, projectId);
	const activityQuery = useProjectActivity(role, projectId, 8);

	// One page of the project's tasks, used for the "my tasks" section. The
	// blocked list gets its own query because it is filtered server-side, so it is
	// the real set rather than whichever blocked tasks happened to land on a page.
	const tasksQuery = useTaskList(role, {
		filters: { projectId },
		rows: SECTION_SCAN_ROWS,
		orderKey: "updatedAt",
		orderRule: "desc",
	});
	const blockedQuery = useTaskList(role, {
		filters: { projectId, isBlocked: true },
		rows: BLOCKED_SCAN_ROWS,
		orderKey: "updatedAt",
		orderRule: "desc",
	});

	const metrics = metricsQuery.data;
	const metricsPending = metricsQuery.isPending;
	const metricsFailed = metricsQuery.isError;

	// A count of zero is a real answer, but only once the server has given one:
	// before that the tiles render as skeletons rather than as "0 tasks".
	const tiles = useMemo<readonly MetricTile[]>(() => {
		if (metrics === undefined) {
			return [];
		}
		const cards = toMetricCards({
			total: metrics.tasks.total,
			completed: metrics.tasks.completed,
			inProgress: metrics.tasks.inProgress,
			blocked: metrics.tasks.blocked,
			todo: metrics.tasks.todo,
			loaded: !metricsPending,
			canDrilldown: true,
		});
		return cards.map((card) => ({
			label: card.label,
			value: card.value,
			...(card.hint === undefined ? {} : { hint: card.hint }),
			...(card.drilldown === null
				? {}
				: { href: buildMetricDrilldownHref(projectId, card.drilldown) }),
		}));
	}, [metrics, metricsPending, projectId]);

	const distribution = useMemo(() => {
		if (metrics === undefined) {
			return [];
		}
		return [
			{
				label: getTaskStatusLabel("TODO"),
				value: metrics.tasks.todo,
				barClass: "bg-muted-foreground/60",
			},
			{
				label: getTaskStatusLabel("IN_PROGRESS"),
				value: metrics.tasks.inProgress,
				barClass: "bg-primary",
			},
			{
				label: getTaskStatusLabel("DONE"),
				value: metrics.tasks.completed,
				barClass: "bg-primary/60",
			},
			{
				label: "Blocked by dependency",
				value: metrics.tasks.blocked,
				barClass: "bg-destructive",
			},
		];
	}, [metrics]);

	// Identity comes from the session, never from a URL parameter, so "my tasks"
	// cannot be pointed at somebody else's work by editing a link. The server
	// scopes the list to projects the caller may see regardless.
	const myTasks = useMemo(() => {
		const tasks = tasksQuery.data?.tasks ?? [];
		if (currentUserId === undefined) {
			return [];
		}
		return tasks.filter((task) => task.assignedToId === currentUserId);
	}, [currentUserId, tasksQuery.data?.tasks]);

	const tasksPending = tasksQuery.isPending;
	const hasNoTasks =
		!metricsPending && !metricsFailed && metrics?.tasks.total === 0;

	return (
		<div className="flex flex-col gap-6">
			{hasNoTasks ? (
				<Card>
					<CardHeader>
						<CardTitle>No tasks yet</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col items-start gap-3">
						<p className="text-sm text-muted-foreground">
							Create the first task to start tracking project progress.
						</p>
						{/* The call to action is offered only where the backend would
						    accept it. Ticking a role check is presentation only, and
						    the create endpoint still refuses anyone else. */}
						{canCreate ? (
							<ButtonLink href={onCreateTaskHref ?? "#project-tasks"}>
								<PlusIcon aria-hidden="true" />
								Create task
							</ButtonLink>
						) : null}
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Project progress</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{metricsFailed ? (
						<QueryErrorState
							error={metricsQuery.error}
							title="Unable to load project metrics"
							onRetry={() => void metricsQuery.refetch()}
						/>
					) : (
						<>
							<ProgressBar
								label="Overall progress"
								percentage={metrics?.progress.percentage ?? 0}
								pending={metricsPending}
							/>
							<p className="text-sm text-muted-foreground">
								{metricsPending
									? "Loading progress..."
									: metrics === undefined
										? "Progress is unavailable."
										: `${String(metrics.progress.percentage)}% complete — ${String(
												metrics.tasks.completed,
											)} of ${String(metrics.tasks.total)} tasks done.`}
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{metricsFailed ? null : (
				<MetricTiles
					title="Task metrics"
					tiles={tiles}
					pending={metricsPending}
				/>
			)}

			{metricsFailed ? null : (
				<StatusDistribution
					title="Task status distribution"
					rows={distribution}
					total={metrics?.tasks.total ?? 0}
					pending={metricsPending}
				/>
			)}

			{metricsFailed ? null : (
				<DepartmentProgress
					rows={metrics?.byDepartment ?? []}
					pending={metricsPending}
				/>
			)}

			{isInternal ? (
				<MyTasksSection
					pending={tasksPending}
					tasks={myTasks}
					totalFromServer={metrics?.tasks.total ?? 0}
				/>
			) : null}

			<ProjectBlockedTasks
				error={blockedQuery.isError ? blockedQuery.error : undefined}
				pending={blockedQuery.isPending}
				tasks={blockedQuery.data?.tasks ?? []}
				totalFromServer={metrics?.tasks.blocked}
				onRetry={
					blockedQuery.isError ? () => void blockedQuery.refetch() : undefined
				}
			/>

			<ProjectActivity
				entries={activityQuery.data?.activity ?? []}
				pending={activityQuery.isPending}
				error={activityQuery.isError ? activityQuery.error : undefined}
				onRetry={
					activityQuery.isError ? () => void activityQuery.refetch() : undefined
				}
			/>
		</div>
	);
}

/**
 * The internal user's own work in this project.
 *
 * The heading states plainly that this is the tasks scanned for the dashboard,
 * because the underlying list is one page: claiming it is every task assigned to
 * the user would be a claim the page size cannot support.
 */
function MyTasksSection({
	tasks,
	pending,
	totalFromServer,
}: {
	tasks: readonly Task[];
	pending?: boolean;
	totalFromServer: number;
}) {
	const byStatus = useMemo(() => {
		const grouped = new Map<string, Task[]>();
		for (const task of tasks) {
			const bucket = grouped.get(task.status);
			if (bucket === undefined) {
				grouped.set(task.status, [task]);
			} else {
				bucket.push(task);
			}
		}
		return [...grouped.entries()];
	}, [tasks]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>My tasks</CardTitle>
			</CardHeader>
			<CardContent aria-busy={pending === true}>
				{pending ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				) : tasks.length === 0 ? (
					<EmptyState
						icon={<KanbanIcon size={22} />}
						title="Nothing assigned to you"
						description={
							totalFromServer > 0
								? "No tasks on this project's most recently updated page are assigned to you."
								: "This project has no tasks yet."
						}
					/>
				) : (
					<div className="flex flex-col gap-4">
						{byStatus.map(([status, group]) => (
							<section className="flex flex-col gap-1.5" key={status}>
								<h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
									{getTaskStatusLabel(status as TaskStatus)}
								</h3>
								<ul className="flex flex-col gap-1">
									{group.map((task) => (
										<li key={task.id}>
											<Link
												className="flex min-h-11 items-center gap-2 rounded-md py-1.5 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
												href={`/tasks/${task.id}`}
											>
												<span>{task.title}</span>
												{getStartBlockedReason(task) !== null ? (
													<span className="text-xs text-destructive">
														Blocked
													</span>
												) : null}
											</Link>
										</li>
									))}
								</ul>
							</section>
						))}
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<BuildingsIcon aria-hidden="true" />
							Showing the {String(SECTION_SCAN_ROWS)} most recently updated
							tasks in this project. Open the task board for the full list.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
