"use client";

import { ArrowLeftIcon, KanbanIcon, ProhibitIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { PageBreadcrumbs, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/provider";
import { formatDate } from "@/lib/format";

import { useTaskDetail } from "../hooks";
import {
	getTaskDepartmentLabel,
	getTaskDepartmentVariant,
	getTaskPriorityLabel,
	getTaskPriorityVariant,
	getTaskStatusLabel,
	getTaskStatusVariant,
} from "../labels";

type TaskDetailSectionProps = {
	taskId: string;
};

export function TaskDetailSection({ taskId }: TaskDetailSectionProps) {
	const { user } = useAuth();
	const role = user?.role;
	const query = useTaskDetail(role, taskId);

	const breadcrumbs = [
		{ label: "Tasks", href: "/tasks" },
		{ label: "Task details" },
	];

	if (query.isPending) {
		return (
			<div className="flex flex-col gap-4">
				<PageBreadcrumbs items={breadcrumbs} />
				<Skeleton className="h-8 w-2/3" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}

	if (query.isError) {
		return (
			<div className="flex flex-col gap-4">
				<PageBreadcrumbs items={breadcrumbs} />
				<QueryErrorState
					error={query.error}
					onRetry={() => void query.refetch()}
				/>
			</div>
		);
	}

	const task = query.data;

	if (!task) {
		return (
			<div className="flex flex-col gap-4">
				<PageBreadcrumbs items={breadcrumbs} />
				<EmptyState
					title="Task not found"
					description="This task does not exist or is not available to you."
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				actions={
					<Button
						render={<Link href="/tasks" />}
						type="button"
						variant="outline"
					>
						<ArrowLeftIcon aria-hidden="true" />
						All tasks
					</Button>
				}
				title={task.title}
				description={task.description ?? "No description provided."}
			>
				<PageBreadcrumbs items={breadcrumbs} />
			</PageHeader>

			<Card>
				<CardHeader>
					<CardTitle>Overview</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={getTaskStatusVariant(task.status)}>
							{getTaskStatusLabel(task.status)}
						</Badge>
						<Badge variant={getTaskPriorityVariant(task.priority)}>
							{getTaskPriorityLabel(task.priority)}
						</Badge>
						<Badge variant={getTaskDepartmentVariant(task.department)}>
							{getTaskDepartmentLabel(task.department)}
						</Badge>
						{task.clientVisible ? (
							<Badge variant="muted">Client visible</Badge>
						) : (
							<Badge variant="muted">Internal only</Badge>
						)}
					</div>
					{task.isBlocked ? (
						<div className="rounded-lg border border-destructive/40 p-3">
							<p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
								<ProhibitIcon aria-hidden="true" />
								Blocked by {task.blockedBy.length}{" "}
								{task.blockedBy.length === 1 ? "task" : "tasks"}
							</p>
							<ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
								{task.blockedBy.map((blocker) => (
									<li key={blocker.taskId}>{blocker.title}</li>
								))}
							</ul>
						</div>
					) : null}
					<dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-muted-foreground">Project</dt>
							<dd className="flex items-center gap-1.5">
								<KanbanIcon aria-hidden="true" />
								{task.project.name}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Assignee</dt>
							<dd>
								{task.assignedTo === null
									? "Unassigned"
									: `${task.assignedTo.name} (${task.assignedTo.email})`}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Created</dt>
							<dd>{formatDate(task.createdAt)}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">Last updated</dt>
							<dd>{formatDate(task.updatedAt)}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>
		</div>
	);
}
