"use client";

import { BuildingsIcon, KanbanIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole } from "@/features/auth/types";
import { getStartBlockedReason } from "@/features/tasks/dependency";
import { useTaskList } from "@/features/tasks/hooks";
import { getTaskStatusLabel } from "@/features/tasks/labels";
import type { Task, TaskStatus } from "@/features/tasks/types";

import { useProjectActivity, useProjectMetrics } from "../hooks";
import { ProjectActivity } from "./project-activity";
import { ProjectBlockedTasks } from "./project-blocked-tasks";
import {
	type MetricTile,
	MetricTiles,
	ProgressBar,
	StatusDistribution,
} from "./project-progress";

const BLOCKED_SCAN_ROWS = 100;

type ProjectDashboardProps = {
	projectId: string;
	role: UserRole | undefined;
	/** The signed-in user's id, used to scope "My tasks" server-side. */
	currentUserId: string | undefined;
};

/**
 * The project dashboard.
 *
 * Every number here comes from the server: `/metrics` supplies the counts and the
 * progress percentage, and the task list supplies the rows behind the blocked and
 * "my tasks" sections. Nothing is totalled up in the browser, because a total the
 * client computes is a business rule the client invented, and it would silently
 * disagree with the API the moment the page size or the filter changed.
 */
export function ProjectDashboard({
	projectId,
	role,
	currentUserId,
}: ProjectDashboardProps) {
	const isInternal = role === "INTERNAL";
	const metricsQuery = useProjectMetrics(role, projectId);
	const activityQuery = useProjectActivity(role, projectId, 8);

	// One page of the project's tasks, used for the two sections that need actual
	// rows. The blocked list and "my tasks" are views over what the server already
	// authorised, not separate fetches per section.
	const tasksQuery = useTaskList(role, {
		filters: { projectId },
		rows: BLOCKED_SCAN_ROWS,
		orderKey: "updatedAt",
		orderRule: "desc",
	});

	const metrics = metricsQuery.data;
	const tiles = useMemo<readonly MetricTile[]>(() => {
		if (metrics === undefined) {
			return [];
		}
		return [
			{ label: "Total tasks", value: metrics.tasks.total },
			{ label: "Completed", value: metrics.tasks.completed },
			{ label: "In progress", value: metrics.tasks.inProgress },
			{ label: "Blocked", value: metrics.tasks.blocked },
			{ label: "To do", value: metrics.tasks.todo },
		];
	}, [metrics]);

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
	const tasks = tasksQuery.data?.tasks ?? [];

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Project progress</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<ProgressBar
						label="Overall progress"
						percentage={metrics?.progress.percentage ?? 0}
						pending={metricsQuery.isPending}
					/>
					<p className="text-sm text-muted-foreground">
						{metricsQuery.isPending
							? "Loading progress..."
							: metrics === undefined
								? "Progress is unavailable."
								: `${String(metrics.progress.percentage)}% complete — ${String(
										metrics.tasks.completed,
									)} of ${String(metrics.tasks.total)} tasks done.`}
					</p>
				</CardContent>
			</Card>

			<MetricTiles
				title="Task metrics"
				tiles={tiles}
				pending={metricsQuery.isPending}
			/>

			<StatusDistribution
				title="Task status distribution"
				rows={distribution}
				total={metrics?.tasks.total ?? 0}
				pending={metricsQuery.isPending}
			/>

			{isInternal ? (
				<MyTasksSection
					pending={tasksPending}
					tasks={myTasks}
					totalFromServer={metrics?.tasks.total ?? 0}
				/>
			) : null}

			<ProjectBlockedTasks pending={tasksPending} tasks={tasks} />

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
								? "No tasks on this project's first page are assigned to you."
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
							Showing the {String(BLOCKED_SCAN_ROWS)} most recently updated
							tasks in this project. Open the task board for the full list.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
