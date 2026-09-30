"use client";

import { FolderOpenIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { DataPagination } from "@/components/ui/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useAuth } from "@/features/auth/provider";
import { DEFAULT_PAGE, DEFAULT_ROWS } from "@/lib/api/query/types";

import { useClientProjectList, useProjectList } from "../hooks";
import { getNextProjectStatuses } from "../lifecycle";
import {
	DEFAULT_PROJECT_ORDER_KEY,
	DEFAULT_PROJECT_ORDER_RULE,
	type ProjectListState,
	parseProjectListState,
	serializeProjectListState,
	toListQueryParams,
	withPage,
	withPageReset,
} from "../list-state";
import type { Project, ProjectStatus } from "../types";
import { ClientProjectCard } from "./client-project-card";
import { buildProjectCardActions, ProjectCard } from "./project-card";
import { ProjectDeleteDialog } from "./project-delete-dialog";
import { ProjectFormDialog } from "./project-form-dialog";
import { ProjectGridSkeleton } from "./project-grid-skeleton";
import { ProjectLifecycleDialog } from "./project-lifecycle-dialog";
import {
	PROJECT_ROWS_OPTIONS,
	ProjectListToolbar,
} from "./project-list-toolbar";

const internalEmptyDescription =
	"Projects you create or are assigned to will appear here.";
const clientEmptyDescription =
	"You are not assigned to any projects yet. Your project manager can add you to a project.";

export function ProjectListSection() {
	const { user } = useAuth();
	const role = user?.role;
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const state = parseProjectListState(
		new URLSearchParams(searchParams.toString()),
	);
	const [formOpen, setFormOpen] = useState(false);
	const [editingProject, setEditingProject] = useState<Project | undefined>();
	const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
	const [lifecycleTarget, setLifecycleTarget] = useState<{
		project: Project;
		status: ProjectStatus;
	} | null>(null);
	const clientQuery = useClientProjectList(role);
	const queryParams = useMemo(() => toListQueryParams(state), [state]);
	const internalQuery = useProjectList(role, queryParams);
	const canManage = role === "PM";
	const isClient = role === "CLIENT";

	const applyState = useCallback(
		(nextState: ProjectListState) => {
			const query = serializeProjectListState(nextState).toString();
			router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router],
	);

	const openCreateDialog = () => {
		setEditingProject(undefined);
		setFormOpen(true);
	};

	const openEditDialog = (project: Project) => {
		setEditingProject(project);
		setFormOpen(true);
	};

	if (!role) {
		return null;
	}

	if (isClient) {
		if (clientQuery.isPending) {
			return <ProjectGridSkeleton />;
		}

		if (clientQuery.isError) {
			return (
				<QueryErrorState
					error={clientQuery.error}
					onRetry={() => void clientQuery.refetch()}
				/>
			);
		}

		if (clientQuery.data.length === 0) {
			return (
				<EmptyState
					icon={<FolderOpenIcon size={22} />}
					title="No projects assigned"
					description={clientEmptyDescription}
				/>
			);
		}

		return (
			<ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{clientQuery.data.map((project) => (
					<li key={project.id}>
						<ClientProjectCard project={project} />
					</li>
				))}
			</ul>
		);
	}

	if (internalQuery.isPending) {
		return <ProjectGridSkeleton />;
	}

	if (internalQuery.isError) {
		return (
			<QueryErrorState
				error={internalQuery.error}
				onRetry={() => void internalQuery.refetch()}
			/>
		);
	}

	const { projects, pagination } = internalQuery.data;
	const hasCriteria =
		state.search.length > 0 ||
		state.status !== "all" ||
		state.orderKey !== DEFAULT_PROJECT_ORDER_KEY ||
		state.orderRule !== DEFAULT_PROJECT_ORDER_RULE ||
		state.rows !== DEFAULT_ROWS;

	return (
		<div className="flex flex-col gap-6">
			<ProjectListToolbar
				canCreate={canManage}
				isFetching={internalQuery.isFetching}
				state={state}
				onCreateClick={openCreateDialog}
				onOrderChange={(orderKey) =>
					applyState(withPageReset(state, { orderKey }))
				}
				onOrderRuleChange={(orderRule) =>
					applyState(withPageReset(state, { orderRule }))
				}
				onRowsChange={(rows) => applyState(withPageReset(state, { rows }))}
				onSearchChange={(search) =>
					applyState(withPageReset(state, { search }))
				}
				onStatusChange={(status) =>
					applyState(withPageReset(state, { status }))
				}
			/>
			{projects.length === 0 ? (
				<EmptyState
					action={
						hasCriteria ? (
							<button
								className="text-sm font-medium text-primary underline-offset-4 hover:underline"
								type="button"
								onClick={() =>
									applyState({
										search: "",
										status: "all",
										orderKey: DEFAULT_PROJECT_ORDER_KEY,
										orderRule: DEFAULT_PROJECT_ORDER_RULE,
										page: DEFAULT_PAGE,
										rows: DEFAULT_ROWS,
									})
								}
							>
								Clear filters
							</button>
						) : canManage ? (
							<button
								className="text-sm font-medium text-primary underline-offset-4 hover:underline"
								type="button"
								onClick={openCreateDialog}
							>
								Create your first project
							</button>
						) : undefined
					}
					icon={<FolderOpenIcon size={22} />}
					title={hasCriteria ? "No matching projects" : "No projects yet"}
					description={
						hasCriteria
							? "No projects match the current search, status and sort filters."
							: internalEmptyDescription
					}
				/>
			) : (
				<>
					<ul
						className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${
							internalQuery.isFetching ? "opacity-60" : "opacity-100"
						}`}
					>
						{projects.map((project) => {
							// The one lifecycle step this project can take, or null once
							// it has reached the end of its lifecycle. The server decides
							// for itself whether the move is allowed; this only stops the
							// list offering a control that would be refused.
							const nextStatus =
								getNextProjectStatuses(project.status)[0] ?? null;

							return (
								<li key={project.id}>
									<ProjectCard
										actions={buildProjectCardActions({
											canEdit: canManage,
											canDelete: canManage,
											nextStatus,
											onEdit: () => openEditDialog(project),
											onDelete: () => setDeleteTarget(project),
											onMoveTo: (status) =>
												setLifecycleTarget({ project, status }),
										})}
										progressPercentage={project.progress.percentage}
										project={project}
									/>
								</li>
							);
						})}
					</ul>
					<DataPagination
						disabled={internalQuery.isFetching}
						pagination={pagination}
						rows={state.rows}
						rowsOptions={PROJECT_ROWS_OPTIONS}
						onPageChange={(page) => applyState(withPage(state, page))}
						onRowsChange={(rows) => applyState(withPageReset(state, { rows }))}
					/>
				</>
			)}
			<ProjectFormDialog
				onOpenChange={setFormOpen}
				open={formOpen}
				project={editingProject}
				role={role}
			/>
			{deleteTarget ? (
				<ProjectDeleteDialog
					onOpenChange={(open) => {
						if (!open) {
							setDeleteTarget(null);
						}
					}}
					open
					project={deleteTarget}
					role={role}
				/>
			) : null}
			{lifecycleTarget ? (
				<ProjectLifecycleDialog
					onOpenChange={(open) => {
						if (!open) {
							setLifecycleTarget(null);
						}
					}}
					open
					project={lifecycleTarget.project}
					targetStatus={lifecycleTarget.status}
				/>
			) : null}
		</div>
	);
}
