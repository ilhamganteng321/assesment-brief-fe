"use client";

import {
	BuildingsIcon,
	KanbanIcon,
	PencilSimpleIcon,
	PlayIcon,
	ProhibitIcon,
	UserCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import {
	getTaskDepartmentLabel,
	getTaskDepartmentVariant,
	getTaskPriorityLabel,
	getTaskPriorityVariant,
	getTaskStatusLabel,
	getTaskStatusVariant,
} from "../labels";
import type { Task } from "../types";

type TaskCardProps = {
	task: Task;
	assigneeName?: string | null;
	projectName?: string;
	/** Why Start is unavailable, or `null` when the task can be started. */
	startBlockedReason?: string | null;
	onEdit?: () => void;
	onStart?: () => void;
};

export function TaskCard({
	task,
	assigneeName,
	projectName,
	startBlockedReason = null,
	onEdit,
	onStart,
}: TaskCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex flex-col gap-2">
					<span className="flex flex-wrap items-center gap-2">
						{task.isBlocked ? (
							<Badge variant="destructive">Blocked</Badge>
						) : null}
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
						) : null}
					</span>
					<span className="flex items-start justify-between gap-3">
						<Link
							className="text-base font-semibold text-foreground hover:underline"
							href={`/tasks/${task.id}`}
						>
							{task.title}
						</Link>
						<span className="flex shrink-0 items-center gap-2">
							{onStart ? (
								<Button
									className="min-h-8"
									size="sm"
									type="button"
									variant="outline"
									disabled={startBlockedReason !== null}
									title={startBlockedReason ?? "Start this task"}
									onClick={onStart}
								>
									<PlayIcon aria-hidden="true" />
									Start
								</Button>
							) : null}
							{onEdit ? (
								<Button
									className="min-h-8 shrink-0"
									size="sm"
									type="button"
									variant="outline"
									onClick={onEdit}
								>
									<PencilSimpleIcon aria-hidden="true" />
									Edit
								</Button>
							) : null}
						</span>
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{task.description ? (
					<p className="text-sm text-muted-foreground">{task.description}</p>
				) : null}
				{task.isBlocked ? (
					<p className="flex flex-wrap items-center gap-1.5 text-sm text-destructive">
						<ProhibitIcon aria-hidden="true" />
						Blocked by {task.blockedBy.length}{" "}
						{task.blockedBy.length === 1 ? "task" : "tasks"}
						{task.blockedBy.map((blocker) => blocker.title).join(", ")}
					</p>
				) : null}
				<dl className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
					<div className="flex items-center gap-1.5">
						<KanbanIcon aria-hidden="true" />
						<dt className="sr-only">Project</dt>
						<dd>{projectName ?? "Project"}</dd>
					</div>
					<div className="flex items-center gap-1.5">
						<UserCircleIcon aria-hidden="true" />
						<dt className="sr-only">Assignee</dt>
						<dd>{assigneeName ?? "Unassigned"}</dd>
					</div>
					<div className="flex items-center gap-1.5">
						<BuildingsIcon aria-hidden="true" />
						<dt className="sr-only">Created</dt>
						<dd>{formatDate(task.createdAt)}</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}
