"use client";

import {
	ArchiveIcon,
	BuildingsIcon,
	CalendarBlankIcon,
	PencilSimpleIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageBreadcrumbs, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useAuth } from "@/features/auth/provider";
import { TaskListSection } from "@/features/tasks/components/task-list-section";
import type {
	TaskAssigneeSummary,
	TaskDepartment,
} from "@/features/tasks/types";
import { formatDate } from "@/lib/format";
import {
	useClientProject,
	useProjectDetail,
	useProjectMembers,
} from "../hooks";
import { getProjectStatusLabel, getProjectStatusVariant } from "../labels";
import { ClientProjectTasks } from "./client-project-tasks";
import { ProjectArchiveDialog } from "./project-archive-dialog";
import { ProjectDashboard } from "./project-dashboard";
import { ProjectDetailSkeleton } from "./project-detail-skeleton";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectMembersCard } from "./project-members-card";

function ProgressBar({ percentage }: { percentage: number }) {
	const value = Number.isFinite(percentage)
		? Math.min(100, Math.max(0, Math.round(percentage)))
		: 0;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-xs">
				<span className="text-muted-foreground">Overall progress</span>
				<span className="font-medium">{value}%</span>
			</div>
			<div
				aria-label={`${value}% complete`}
				aria-valuemax={100}
				aria-valuemin={0}
				aria-valuenow={value}
				className="h-2 w-full overflow-hidden rounded-full bg-muted"
				role="progressbar"
			>
				<div
					className="h-full rounded-full bg-primary transition-[width]"
					style={{ width: `${value}%` }}
				/>
			</div>
		</div>
	);
}

type ProjectDetailSectionProps = {
	projectId: string;
};

export function ProjectDetailSection({ projectId }: ProjectDetailSectionProps) {
	const { user } = useAuth();
	const role = user?.role;
	const isClient = role === "CLIENT";
	const router = useRouter();
	const [editOpen, setEditOpen] = useState(false);
	const [archiveOpen, setArchiveOpen] = useState(false);
	const internalProject = useProjectDetail(role, projectId);
	const membersQuery = useProjectMembers(role, projectId);
	const clientProject = useClientProject(role, projectId);
	const query = isClient ? clientProject : internalProject;
	const canManage = role === "PM";

	const breadcrumbs = [
		{ label: "Projects", href: "/projects" },
		{ label: "Project details" },
	];

	if (query.isPending) {
		return <ProjectDetailSkeleton />;
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

	if (isClient) {
		const project = clientProject.data;

		if (!project) {
			return (
				<div className="flex flex-col gap-4">
					<PageBreadcrumbs items={breadcrumbs} />
					<EmptyState
						title="Project not found"
						description="This project is not available to your account."
					/>
				</div>
			);
		}

		return (
			<div className="flex flex-col gap-6">
				<PageHeader title={project.name}>
					<PageBreadcrumbs items={breadcrumbs} />
				</PageHeader>
				<Card>
					<CardHeader>
						<CardTitle>Progress</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<ProgressBar percentage={project.progress.percentage} />
						<dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
							<div className="rounded-lg border p-3">
								<dt className="text-xs text-muted-foreground">Total</dt>
								<dd className="font-heading text-lg font-semibold">
									{project.tasks.total}
								</dd>
							</div>
							<div className="rounded-lg border p-3">
								<dt className="text-xs text-muted-foreground">Completed</dt>
								<dd className="font-heading text-lg font-semibold">
									{project.tasks.completed}
								</dd>
							</div>
							<div className="rounded-lg border p-3">
								<dt className="text-xs text-muted-foreground">In progress</dt>
								<dd className="font-heading text-lg font-semibold">
									{project.tasks.inProgress}
								</dd>
							</div>
							<div className="rounded-lg border p-3">
								<dt className="text-xs text-muted-foreground">Blocked</dt>
								<dd className="font-heading text-lg font-semibold">
									{project.tasks.blocked}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>
				<ClientProjectTasks projectId={project.id} />
			</div>
		);
	}

	const project = internalProject.data;

	if (!project) {
		return (
			<div className="flex flex-col gap-4">
				<PageBreadcrumbs items={breadcrumbs} />
				<EmptyState
					title="Project not found"
					description="This project does not exist or is not available to you."
				/>
			</div>
		);
	}

	// Only internal members can own a task. A `CLIENT` department identifies a
	// client account, which the backend rejects as an assignee.
	const taskAssignees: TaskAssigneeSummary[] = (membersQuery.data ?? [])
		.filter(
			(
				member,
			): member is typeof member & {
				user: { department: TaskDepartment };
			} => member.user.department !== "CLIENT",
		)
		.map((member) => ({
			id: member.user.id,
			name: member.user.name,
			email: member.user.email,
			department: member.user.department,
		}));

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				actions={
					canManage ? (
						<>
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditOpen(true)}
							>
								<PencilSimpleIcon aria-hidden="true" />
								Edit
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={() => setArchiveOpen(true)}
							>
								<ArchiveIcon aria-hidden="true" />
								Archive
							</Button>
						</>
					) : undefined
				}
				title={project.name}
				description={project.description ?? "No description provided."}
			>
				<PageBreadcrumbs items={breadcrumbs} />
			</PageHeader>
			<Card>
				<CardHeader>
					<CardTitle>Details</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={getProjectStatusVariant(project.status)}>
							{getProjectStatusLabel(project.status)}
						</Badge>
						{project.clientName ? (
							<span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
								<BuildingsIcon aria-hidden="true" />
								{project.clientName}
							</span>
						) : null}
					</div>
					<dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
						<div className="flex items-center gap-2">
							<CalendarBlankIcon
								aria-hidden="true"
								className="text-muted-foreground"
							/>
							<dt className="text-muted-foreground">Created</dt>
							<dd>{formatDate(project.createdAt)}</dd>
						</div>
						<div className="flex items-center gap-2">
							<CalendarBlankIcon
								aria-hidden="true"
								className="text-muted-foreground"
							/>
							<dt className="text-muted-foreground">Last updated</dt>
							<dd>{formatDate(project.updatedAt)}</dd>
						</div>
					</dl>
				</CardContent>
			</Card>
			<ProjectMembersCard
				isLoading={membersQuery.isPending}
				members={membersQuery.data}
			/>
			<ProjectDashboard
				currentUserId={user?.id}
				projectId={project.id}
				role={role}
			/>
			<Card>
				<CardHeader>
					<CardTitle>Tasks</CardTitle>
				</CardHeader>
				<CardContent>
					<TaskListSection
						assignees={taskAssignees}
						projectId={project.id}
						projectName={project.name}
					/>
				</CardContent>
			</Card>
			{canManage ? (
				<>
					<ProjectFormDialog
						onOpenChange={setEditOpen}
						open={editOpen}
						project={project}
						role={role}
					/>
					<ProjectArchiveDialog
						onArchived={() => router.push("/projects")}
						onOpenChange={setArchiveOpen}
						open={archiveOpen}
						project={project}
						role={role}
					/>
				</>
			) : null}
		</div>
	);
}
