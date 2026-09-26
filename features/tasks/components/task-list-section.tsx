"use client";

import { KanbanIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { DataPagination } from "@/components/ui/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useAuth } from "@/features/auth/provider";
import { getApiErrorMessage } from "@/lib/api/error";
import { DEFAULT_ROWS } from "@/lib/api/query/types";

import { getStartBlockedReason } from "../dependency";
import { useTaskList, useUpdateTask } from "../hooks";
import {
	DEFAULT_TASK_LIST_STATE,
	DEFAULT_TASK_ORDER_KEY,
	DEFAULT_TASK_ORDER_RULE,
	parseTaskListState,
	serializeTaskListState,
	type TaskListState,
	toTaskListQueryParams,
	withTaskPage,
	withTaskPageReset,
} from "../list-state";
import type { Task, TaskAssigneeSummary } from "../types";
import { TaskBoard, TaskBoardEmpty } from "./task-board";
import { TaskCard } from "./task-card";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskListSkeleton } from "./task-list-skeleton";
import { TASK_ROWS_OPTIONS, TaskListToolbar } from "./task-list-toolbar";

type TaskListSectionProps = {
	/** Scopes the list to one project and enables the create/edit form. */
	projectId?: string;
	/** Eligible assignees for the task form. */
	assignees?: readonly TaskAssigneeSummary[];
	/** Display name for the scoped project. */
	projectName?: string;
};

export function TaskListSection({
	projectId = "",
	assignees = [],
	projectName,
}: TaskListSectionProps) {
	const { user } = useAuth();
	const role = user?.role;
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const search = searchParams.toString();
	// Both objects are memoized on primitive inputs so the downstream query
	// params memo below is not invalidated by a new object on every render.
	const urlState = useMemo(
		() => parseTaskListState(new URLSearchParams(search)),
		[search],
	);
	// On a project page the project comes from the route rather than the query
	// string, so the visible scope cannot be widened by editing the URL.
	const state = useMemo<TaskListState>(
		() => ({ ...urlState, projectId: projectId || urlState.projectId }),
		[projectId, urlState],
	);
	const [formOpen, setFormOpen] = useState(false);
	// Only the id is held, never a task snapshot. A rejected optimistic-lock
	// conflict triggers a refetch, and the dialog has to render the row that
	// actually won -- otherwise it would keep resubmitting the stale version and
	// never converge.
	const [editingTaskId, setEditingTaskId] = useState<string | undefined>();
	const queryParams = useMemo(() => toTaskListQueryParams(state), [state]);
	const query = useTaskList(role, queryParams);
	const startTask = useUpdateTask();
	const canManage = role === "PM";
	const assigneeNames = useMemo(
		() => new Map(assignees.map((assignee) => [assignee.id, assignee.name])),
		[assignees],
	);

	const applyState = useCallback(
		(nextState: TaskListState) => {
			const next = serializeTaskListState(nextState).toString();
			router.replace(next.length > 0 ? `${pathname}?${next}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router],
	);

	const openCreateDialog = () => {
		setEditingTaskId(undefined);
		setFormOpen(true);
	};

	const openEditDialog = (task: Task) => {
		setEditingTaskId(task.id);
		setFormOpen(true);
	};

	// The server owns the guard, so the button is only a convenience: the same
	// request would be rejected with TASK_BLOCKED if it were forced through.
	const start = (task: Task) => {
		startTask.mutate({
			taskId: task.id,
			payload: { status: "IN_PROGRESS", version: task.version },
		});
	};

	if (!role) {
		return null;
	}

	if (query.isPending) {
		return <TaskListSkeleton />;
	}

	if (query.isError) {
		return (
			<QueryErrorState
				error={query.error}
				onRetry={() => void query.refetch()}
			/>
		);
	}

	const { tasks, pagination } = query.data;
	// Resolved from the live page rather than remembered on click, so the dialog
	// always submits the version the server currently holds.
	const editingTask =
		editingTaskId === undefined
			? undefined
			: tasks.find((task) => task.id === editingTaskId);
	const hasCriteria =
		state.search.length > 0 ||
		state.status !== "all" ||
		state.priority !== "all" ||
		state.department !== "all" ||
		state.orderKey !== DEFAULT_TASK_ORDER_KEY ||
		state.orderRule !== DEFAULT_TASK_ORDER_RULE ||
		state.rows !== DEFAULT_ROWS;

	return (
		<div className="flex flex-col gap-6">
			<TaskListToolbar
				canCreate={canManage && state.projectId.length > 0}
				isFetching={query.isFetching}
				state={state}
				onCreateClick={openCreateDialog}
				onDepartmentChange={(department) =>
					applyState(withTaskPageReset(state, { department }))
				}
				onOrderChange={(orderKey) =>
					applyState(withTaskPageReset(state, { orderKey }))
				}
				onOrderRuleChange={(orderRule) =>
					applyState(withTaskPageReset(state, { orderRule }))
				}
				onPriorityChange={(priority) =>
					applyState(withTaskPageReset(state, { priority }))
				}
				onRowsChange={(rows) => applyState(withTaskPageReset(state, { rows }))}
				onSearchChange={(search) =>
					applyState(withTaskPageReset(state, { search }))
				}
				onStatusChange={(status) =>
					applyState(withTaskPageReset(state, { status }))
				}
				onViewChange={(view) => applyState({ ...state, view })}
			/>
			{startTask.isError ? (
				<p className="text-sm text-destructive">
					{getApiErrorMessage(startTask.error)}
				</p>
			) : null}
			{tasks.length === 0 ? (
				state.view === "board" ? (
					<TaskBoardEmpty
						canCreate={canManage && state.projectId.length > 0}
						hasCriteria={hasCriteria}
						onClearFilters={() =>
							applyState({
								...DEFAULT_TASK_LIST_STATE,
								projectId: state.projectId,
								view: "board",
							})
						}
						onCreate={openCreateDialog}
					/>
				) : (
					<EmptyState
						action={
							hasCriteria ? (
								<button
									className="text-sm font-medium text-primary underline-offset-4 hover:underline"
									type="button"
									onClick={() =>
										applyState({
											...DEFAULT_TASK_LIST_STATE,
											projectId: state.projectId,
										})
									}
								>
									Clear filters
								</button>
							) : canManage && state.projectId.length > 0 ? (
								<button
									className="text-sm font-medium text-primary underline-offset-4 hover:underline"
									type="button"
									onClick={openCreateDialog}
								>
									Create the first task
								</button>
							) : undefined
						}
						icon={<KanbanIcon size={22} />}
						title={hasCriteria ? "No matching tasks" : "No tasks yet"}
						description={
							hasCriteria
								? "No tasks match the current search and filters."
								: "Tasks you can see will appear here."
						}
					/>
				)
			) : state.view === "board" ? (
				<div
					className={`transition-opacity ${
						query.isFetching ? "opacity-60" : "opacity-100"
					}`}
				>
					<TaskBoard
						assigneeNames={assigneeNames}
						projectName={projectName}
						tasks={tasks}
						onEdit={canManage ? openEditDialog : undefined}
						onStart={canManage ? start : undefined}
					/>
				</div>
			) : (
				<>
					<ul
						className={`flex flex-col gap-3 transition-opacity ${
							query.isFetching ? "opacity-60" : "opacity-100"
						}`}
					>
						{tasks.map((task) => (
							<li key={task.id}>
								<TaskCard
									assigneeName={assigneeNames.get(task.assignedToId ?? "")}
									projectName={projectName}
									startBlockedReason={getStartBlockedReason(task)}
									task={task}
									onEdit={canManage ? () => openEditDialog(task) : undefined}
									onStart={canManage ? () => start(task) : undefined}
								/>
							</li>
						))}
					</ul>
					<DataPagination
						disabled={query.isFetching}
						pagination={pagination}
						rows={state.rows}
						rowsOptions={TASK_ROWS_OPTIONS}
						onPageChange={(page) => applyState(withTaskPage(state, page))}
						onRowsChange={(rows) =>
							applyState(withTaskPageReset(state, { rows }))
						}
					/>
				</>
			)}
			{canManage &&
			state.projectId.length > 0 &&
			(editingTaskId === undefined || editingTask !== undefined) ? (
				<TaskFormDialog
					assignees={assignees}
					onOpenChange={setFormOpen}
					open={formOpen}
					projectId={state.projectId}
					role={role}
					task={editingTask}
				/>
			) : null}
		</div>
	);
}
