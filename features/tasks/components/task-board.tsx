"use client";

import { ProhibitIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/ui/empty-state";
import {
	getStartBlockedReason,
	groupTasksIntoBoard,
	TASK_BOARD_COLUMNS,
	type TaskBoardColumn,
} from "../dependency";
import type { Task } from "../types";
import { TaskCard } from "./task-card";

const columnTitles: Record<TaskBoardColumn, string> = {
	TODO: "To do",
	BLOCKED: "Blocked",
	IN_PROGRESS: "In progress",
	DONE: "Done",
};

type TaskBoardProps = {
	tasks: readonly Task[];
	projectName?: string;
	onEdit?: (task: Task) => void;
	onStart?: (task: Task) => void;
};

/**
 * The dependency-aware board. Every column comes from server state: the
 * `BLOCKED` column is filled from the calculated `isBlocked`, never from a
 * status the client is allowed to set. Cards read their assignee from the task's
 * own resolved field rather than from a name map passed in, so the board needs no
 * member list of its own.
 */
export function TaskBoard({
	tasks,
	projectName,
	onEdit,
	onStart,
}: TaskBoardProps) {
	const board = groupTasksIntoBoard(tasks);

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
			{TASK_BOARD_COLUMNS.map((column) => {
				const columnTasks = board[column];

				return (
					<section
						key={column}
						aria-label={columnTitles[column]}
						className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card/40 p-3"
					>
						<header className="flex items-center justify-between gap-2">
							<h2 className="flex items-center gap-1.5 text-sm font-semibold">
								{column === "BLOCKED" ? (
									<ProhibitIcon aria-hidden="true" />
								) : null}
								{columnTitles[column]}
							</h2>
							<span className="text-xs text-muted-foreground">
								{columnTasks.length}
							</span>
						</header>
						{columnTasks.length === 0 ? (
							<p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
								Nothing here.
							</p>
						) : (
							<ul className="flex flex-col gap-3">
								{columnTasks.map((task) => (
									<li key={task.id}>
										<TaskCard
											projectName={projectName}
											startBlockedReason={getStartBlockedReason(task)}
											task={task}
											onEdit={onEdit ? () => onEdit(task) : undefined}
											onStart={onStart ? () => onStart(task) : undefined}
										/>
									</li>
								))}
							</ul>
						)}
					</section>
				);
			})}
		</div>
	);
}

type TaskBoardEmptyProps = {
	hasCriteria: boolean;
	canCreate: boolean;
	onClearFilters: () => void;
	onCreate: () => void;
};

export function TaskBoardEmpty({
	hasCriteria,
	canCreate,
	onClearFilters,
	onCreate,
}: TaskBoardEmptyProps) {
	return (
		<EmptyState
			action={
				hasCriteria ? (
					<button
						className="text-sm font-medium text-primary underline-offset-4 hover:underline"
						type="button"
						onClick={onClearFilters}
					>
						Clear filters
					</button>
				) : canCreate ? (
					<button
						className="text-sm font-medium text-primary underline-offset-4 hover:underline"
						type="button"
						onClick={onCreate}
					>
						Create the first task
					</button>
				) : undefined
			}
			title={hasCriteria ? "No matching tasks" : "No tasks yet"}
			description={
				hasCriteria
					? "No tasks match the current search and filters."
					: "Tasks you can see will appear on the board."
			}
		/>
	);
}
