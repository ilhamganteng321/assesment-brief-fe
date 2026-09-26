"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";

import { PageBreadcrumbs, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/provider";
import {
	getTaskStatusLabel,
	getTaskStatusVariant,
} from "@/features/tasks/labels";

import { useClientProjectTask } from "../hooks";

type ClientTaskDetailSectionProps = {
	projectId: string;
	taskId: string;
};

/**
 * The client guest's view of one task.
 *
 * This reads `/client/projects/:projectId/tasks/:taskId`, whose response carries
 * only a title, description, status, and the visibility flag. There is no
 * assignee, department, version, dependency, or audit field available here, so
 * none can be rendered even by accident: the restricted projection is the server's
 * decision, not a set of hidden columns in this component.
 */
export function ClientTaskDetailSection({
	projectId,
	taskId,
}: ClientTaskDetailSectionProps) {
	const { user } = useAuth();
	const query = useClientProjectTask(user?.role, projectId, taskId);

	const breadcrumbs = [
		{ label: "Projects", href: "/projects" },
		{ label: "Task", href: `/projects/${projectId}` },
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
					title="Task unavailable"
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
					description="This task is not available to your account."
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				actions={
					<ButtonLink href={`/projects/${projectId}`} variant="outline">
						<ArrowLeftIcon aria-hidden="true" />
						Back to project
					</ButtonLink>
				}
				title={task.title}
				description="Shared with you by your project team."
			>
				<PageBreadcrumbs items={breadcrumbs} />
			</PageHeader>

			<Card>
				<CardHeader>
					<CardTitle>Progress</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={getTaskStatusVariant(task.status)}>
							{getTaskStatusLabel(task.status)}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">
						{`This task is currently ${getTaskStatusLabel(task.status).toLowerCase()}.`}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Description</CardTitle>
				</CardHeader>
				<CardContent>
					<p
						className={
							task.description === null
								? "text-sm italic text-muted-foreground"
								: "text-sm"
						}
					>
						{task.description ?? "No description provided."}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
