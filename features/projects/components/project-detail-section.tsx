"use client";

import {
	BuildingsIcon,
	PencilSimpleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageBreadcrumbs, PageHeader } from "@/components/layout/page-header";
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
import { normalizeApiError } from "@/lib/api/error";
import { formatDate } from "@/lib/format";

import {
	useClientProject,
	useProjectDetail,
	useProjectMembers,
} from "../hooks";
import { getProjectStatusDescription } from "../labels";
import {
	canDeleteProject,
	canEditProjectNow,
	getAvailableLifecycleActions,
} from "../permissions";
import type { ProjectStatus } from "../types";
import { ClientProjectTasks } from "./client-project-tasks";
import { ProjectDashboard } from "./project-dashboard";
import { ProjectDeleteDialog } from "./project-delete-dialog";
import { ProjectDetailSkeleton } from "./project-detail-skeleton";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectLifecycleDialog } from "./project-lifecycle-dialog";
import { ProjectMembersSection } from "./project-members-section";
import { ProjectOverview } from "./project-overview";
import { ProjectStatusBadge } from "./project-status-badge";
import { ProjectTabs } from "./project-tabs";

/**
 * One project: its overview, its tasks, its members and its history.
 *
 * The header states where the project is in its lifecycle and offers the single
 * step it can take from there. Every control is permission-gated by the
 * `permissions` module, which mirrors the server's policy: an internal user and
 * a client guest see no lifecycle or edit controls at all, because the API would
 * refuse them. That is a usability measure, not a security one — the backend
 * re-checks the role, the project visibility rule and the lifecycle itself on
 * every request.
 *
 * The client guest's view is a separate branch all the way down rather than the
 * same page with fields hidden: it reads the scoped `/client` payloads, which
 * never carry an assignee, a department, a version or an audit trail.
 */
export function ProjectDetailSection({ projectId }: { projectId: string }) {
	const { user } = useAuth();
	const role = user?.role;
	const isClient = role === "CLIENT";
	const router = useRouter();
	const [editOpen, setEditOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [lifecycleTarget, setLifecycleTarget] = useState<ProjectStatus | null>(
		null,
	);
	const internalProject = useProjectDetail(role, projectId);
	const membersQuery = useProjectMembers(role, projectId);
	const clientProject = useClientProject(role, projectId);
	const query = isClient ? clientProject : internalProject;

	const breadcrumbs = [
		{ label: "Projects", href: "/projects" },
		{ label: "Project details" },
	];

	if (query.isPending) {
		return <ProjectDetailSkeleton />;
	}

	if (query.isError) {
		const code = normalizeApiError(query.error).code;

		return (
			<div className="flex flex-col gap-4">
				<PageBreadcrumbs items={breadcrumbs} />
				<QueryErrorState
					description={
						code === "PROJECT_ACCESS_DENIED"
							? "This project is not available to your account."
							: code === "PROJECT_NOT_FOUND"
								? "This project does not exist, or it has been deleted."
								: undefined
					}
					error={query.error}
					title={
						code === "PROJECT_ACCESS_DENIED"
							? "You do not have access to this project"
							: "Unable to load this project"
					}
					onRetry={() => void query.refetch()}
				/>
			</div>
		);
	}

	if (isClient) {
		const clientDetail = clientProject.data;

		if (!clientDetail) {
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
				<PageHeader title={clientDetail.name}>
					<PageBreadcrumbs items={breadcrumbs} />
				</PageHeader>
				<ProjectOverview metrics={clientDetail} />
				<ClientProjectTasks projectId={clientDetail.id} />
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
	// client account, which the backend rejects as an assignee. The member list
	// already carries the role, and it is passed through because the assignee
	// control shows what the person will be able to do with the task.
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
			role: member.user.role,
			department: member.user.department,
		}));

	const canEdit = canEditProjectNow({ role }, project);
	const canDelete = canDeleteProject({ role });
	const lifecycleActions = getAvailableLifecycleActions({ role }, project);
	const hasPrimaryActions = canEdit || canDelete || lifecycleActions.length > 0;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				actions={
					hasPrimaryActions ? (
						<>
							{canEdit ? (
								<Button
									type="button"
									variant="outline"
									onClick={() => setEditOpen(true)}
								>
									<PencilSimpleIcon aria-hidden="true" />
									Edit Project
								</Button>
							) : null}
							{lifecycleActions.map((action) => (
								<Button
									key={action.targetStatus}
									type="button"
									variant={
										action.targetStatus === "ARCHIVED" ? "outline" : "default"
									}
									onClick={() => setLifecycleTarget(action.targetStatus)}
								>
									{action.label}
								</Button>
							))}
							{canDelete ? (
								<Button
									aria-label={`Delete ${project.name}`}
									type="button"
									variant="destructive"
									onClick={() => setDeleteOpen(true)}
								>
									<TrashIcon aria-hidden="true" />
									Delete
								</Button>
							) : null}
						</>
					) : undefined
				}
				title={project.name}
				description={project.description ?? "No description provided."}
			>
				<PageBreadcrumbs items={breadcrumbs} />
			</PageHeader>

			<Card>
				<CardContent className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-3">
						<ProjectStatusBadge status={project.status} />
						{project.clientName ? (
							<span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
								<BuildingsIcon aria-hidden="true" />
								{project.clientName}
							</span>
						) : null}
					</div>
					<p className="text-sm text-muted-foreground">
						{getProjectStatusDescription(project.status)}
					</p>
				</CardContent>
			</Card>

			<ProjectTabs activeSection="overview" projectId={project.id} />

			<ProjectDashboard
				currentUserId={user?.id}
				projectId={project.id}
				role={role}
				// Points at the task board further down this page rather than opening
				// a second create dialog. The board already owns that affordance, and
				// one create path is easier to keep permission-correct than two.
				onCreateTaskHref="#project-tasks"
			/>

			<Card id="project-tasks">
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

			<ProjectMembersSection id="project-members" project={project} />

			<Card>
				<CardHeader>
					<CardTitle>Record</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
						<div className="flex items-center gap-2">
							<dt className="text-muted-foreground">Created</dt>
							<dd>
								<time dateTime={project.createdAt}>
									{formatDate(project.createdAt)}
								</time>
							</dd>
						</div>
						<div className="flex items-center gap-2">
							<dt className="text-muted-foreground">Last updated</dt>
							<dd>
								<time dateTime={project.updatedAt}>
									{formatDate(project.updatedAt)}
								</time>
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			{canEdit ? (
				<ProjectFormDialog
					onOpenChange={setEditOpen}
					open={editOpen}
					project={project}
					role={role}
				/>
			) : null}

			{canDelete ? (
				<ProjectDeleteDialog
					onDeleted={() => router.push("/projects")}
					onOpenChange={setDeleteOpen}
					open={deleteOpen}
					project={project}
					role={role}
				/>
			) : null}

			{lifecycleTarget === null ? null : (
				<ProjectLifecycleDialog
					onOpenChange={(nextOpen) => {
						if (!nextOpen) {
							setLifecycleTarget(null);
						}
					}}
					open
					project={project}
					targetStatus={lifecycleTarget}
				/>
			)}
		</div>
	);
}
