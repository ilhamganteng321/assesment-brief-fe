"use client";

import { FolderOpenIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useAuth } from "@/features/auth/provider";
import { ProjectGridSkeleton } from "@/features/projects/components/project-grid-skeleton";
import {
	useClientProjectList,
	useProjectList,
} from "@/features/projects/hooks";
import {
	getProjectStatusLabel,
	getProjectStatusVariant,
} from "@/features/projects/labels";
import { formatDate } from "@/lib/format";

type StatCardProps = {
	label: string;
	value: number;
};

function StatCard({ label, value }: StatCardProps) {
	return (
		<Card size="sm">
			<CardContent className="flex flex-col gap-1">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="font-heading text-2xl font-semibold">{value}</p>
			</CardContent>
		</Card>
	);
}

function InternalDashboard() {
	const { user } = useAuth();
	const projectsQuery = useProjectList(user?.role);
	const projects = projectsQuery.data?.projects ?? [];
	const activeCount = projects.filter(
		(project) => project.status === "ACTIVE",
	).length;
	const completedCount = projects.filter(
		(project) => project.status === "COMPLETED",
	).length;
	const archivedCount = projects.filter(
		(project) => project.status === "ARCHIVED",
	).length;
	const recentProjects = [...projects]
		.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
		.slice(0, 4);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title={`Welcome back, ${user?.name.split(" ")[0] ?? "there"}`}
				description="A snapshot of the projects you can access."
			/>
			{projectsQuery.isPending ? <ProjectGridSkeleton count={3} /> : null}
			{projectsQuery.isError ? (
				<QueryErrorState
					error={projectsQuery.error}
					onRetry={() => void projectsQuery.refetch()}
				/>
			) : null}
			{projectsQuery.isSuccess ? (
				<>
					<section aria-label="Project totals">
						<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
							<StatCard label="All projects" value={projects.length} />
							<StatCard label="Active" value={activeCount} />
							<StatCard label="Completed" value={completedCount} />
							<StatCard label="Archived" value={archivedCount} />
						</div>
					</section>
					<Card>
						<CardHeader>
							<CardTitle>Recently updated</CardTitle>
							<CardDescription>
								The projects you touched most recently.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{recentProjects.length === 0 ? (
								<EmptyState
									icon={<FolderOpenIcon size={22} />}
									title="No projects yet"
									description="Projects you create or are assigned to will appear here."
								/>
							) : (
								<ul className="flex flex-col divide-y">
									{recentProjects.map((project) => (
										<li key={project.id}>
											<Link
												className="flex min-h-11 flex-col gap-1 rounded-md py-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:items-center sm:justify-between"
												href={`/projects/${project.id}`}
											>
												<span className="font-medium">{project.name}</span>
												<span className="flex items-center gap-2">
													<Badge
														variant={getProjectStatusVariant(project.status)}
													>
														{getProjectStatusLabel(project.status)}
													</Badge>
													<span className="text-xs text-muted-foreground">
														Updated {formatDate(project.updatedAt)}
													</span>
												</span>
											</Link>
										</li>
									))}
								</ul>
							)}
							<Button
								className="mt-4 min-h-11"
								render={<Link href="/projects" />}
								variant="outline"
							>
								View all projects
							</Button>
						</CardContent>
					</Card>
				</>
			) : null}
		</div>
	);
}

function ClientDashboard() {
	const { user } = useAuth();
	const projectsQuery = useClientProjectList(user?.role);
	const projects = projectsQuery.data ?? [];
	const taskTotals = projects.reduce(
		(totals, project) => ({
			total: totals.total + project.tasks.total,
			completed: totals.completed + project.tasks.completed,
			inProgress: totals.inProgress + project.tasks.inProgress,
			blocked: totals.blocked + project.tasks.blocked,
		}),
		{ total: 0, completed: 0, inProgress: 0, blocked: 0 },
	);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title={`Welcome back, ${user?.name.split(" ")[0] ?? "there"}`}
				description="Progress on the projects your team shares with you."
			/>
			{projectsQuery.isPending ? <ProjectGridSkeleton count={3} /> : null}
			{projectsQuery.isError ? (
				<QueryErrorState
					error={projectsQuery.error}
					onRetry={() => void projectsQuery.refetch()}
				/>
			) : null}
			{projectsQuery.isSuccess ? (
				<>
					<section aria-label="Task totals">
						<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
							<StatCard label="Your projects" value={projects.length} />
							<StatCard label="Tasks shared" value={taskTotals.total} />
							<StatCard label="Completed" value={taskTotals.completed} />
							<StatCard label="In progress" value={taskTotals.inProgress} />
						</div>
					</section>
					{taskTotals.blocked > 0 ? (
						<Card size="sm" className="border-destructive/40">
							<CardContent className="flex flex-wrap items-center justify-between gap-2">
								<p className="text-sm text-muted-foreground">
									{taskTotals.blocked} shared{" "}
									{taskTotals.blocked === 1 ? "task is" : "tasks are"} currently
									blocked.
								</p>
								<Button
									className="min-h-11"
									render={<Link href="/projects" />}
									size="sm"
									variant="outline"
								>
									Review projects
								</Button>
							</CardContent>
						</Card>
					) : null}
					<Card>
						<CardHeader>
							<CardTitle>Your projects</CardTitle>
							<CardDescription>
								Open a project to see the tasks shared with you.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{projects.length === 0 ? (
								<EmptyState
									icon={<FolderOpenIcon size={22} />}
									title="No projects assigned"
									description="Your project manager can add you to a project once it is ready."
								/>
							) : (
								<ul className="flex flex-col divide-y">
									{projects.map((project) => (
										<li key={project.id}>
											<Link
												className="flex min-h-11 items-center justify-between gap-3 rounded-md py-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
												href={`/projects/${project.id}`}
											>
												<span className="font-medium">{project.name}</span>
												<span className="text-sm text-muted-foreground">
													{Math.min(
														100,
														Math.max(
															0,
															Math.round(project.progress.percentage),
														),
													)}
													% complete
												</span>
											</Link>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</>
			) : null}
		</div>
	);
}

export function DashboardSection() {
	const { user } = useAuth();

	if (!user) {
		return null;
	}

	if (user.role === "CLIENT") {
		return <ClientDashboard />;
	}

	return <InternalDashboard />;
}
