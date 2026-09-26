"use client";

import {
	ArrowLeftIcon,
	KanbanIcon,
	PencilSimpleIcon,
	ProhibitIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageBreadcrumbs, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AttachmentPanel } from "@/features/attachments/components/attachment-panel";
import { useAuth } from "@/features/auth/provider";
import { useProjectMembers } from "@/features/projects/hooks";
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
import { canEditTask } from "../permissions";
import type { TaskAssigneeSummary } from "../types";
import { TaskActivityPanel } from "./task-activity-panel";
import { TaskDependencyPanel } from "./task-dependency-panel";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskStatusPanel } from "./task-status-panel";

type TaskDetailSectionProps = {
	taskId: string;
};

export function TaskDetailSection({ taskId }: TaskDetailSectionProps) {
	const { user } = useAuth();
	const role = user?.role;
	const query = useTaskDetail(role, taskId);
	// The form reads the task from the query cache rather than a snapshot taken
	// when the dialog opened, so a conflict refetch hands it the winning row and
	// the next submit carries the current version.
	const [formOpen, setFormOpen] = useState(false);

	const task = query.data;
	// Hook order has to be stable across renders, so the member list is requested
	// from whatever project the cached task belongs to. It stays disabled while
	// the task is still loading because the id is not known yet.
	const projectId = task?.projectId ?? "";
	const membersQuery = useProjectMembers(role, projectId);
	const assignees = useMemo<TaskAssigneeSummary[]>(
		() =>
			(membersQuery.data ?? []).map((member) => ({
				id: member.user.id,
				name: member.user.name,
				email: member.user.email,
				department:
					member.user.department === "CLIENT"
						? "PRODUCT"
						: member.user.department,
			})),
		[membersQuery.data],
	);

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

	const canEdit = canEditTask(user ?? { role: undefined }, task);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				actions={
					<div className="flex flex-wrap items-center gap-2">
						{canEdit ? (
							<Button
								type="button"
								variant="outline"
								onClick={() => setFormOpen(true)}
							>
								<PencilSimpleIcon aria-hidden="true" />
								Edit task
							</Button>
						) : null}
						<Button
							render={<Link href="/tasks" />}
							type="button"
							variant="outline"
						>
							<ArrowLeftIcon aria-hidden="true" />
							All tasks
						</Button>
					</div>
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
									<li key={blocker.id}>
										{blocker.deleted ? (
											<span className="line-through">{blocker.title}</span>
										) : (
											<Link
												className="hover:underline"
												href={`/tasks/${blocker.id}`}
											>
												{blocker.title}
											</Link>
										)}
									</li>
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

			<TaskStatusPanel task={task} />
			<TaskDependencyPanel task={task} />
			<AttachmentPanel projectId={task.projectId} taskId={task.id} />
			<TaskActivityPanel task={task} />
			{canEdit ? (
				<TaskFormDialog
					assignees={assignees}
					onOpenChange={setFormOpen}
					open={formOpen}
					projectId={task.projectId}
					role={role}
					task={task}
				/>
			) : null}
		</div>
	);
}
