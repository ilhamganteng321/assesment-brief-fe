"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import Link from "next/link";
import { type FormEvent, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/ui/query-error-state";

import { useAuth } from "@/features/auth/provider";
import { useClientProjectTasks } from "../hooks";
import { getTaskStatusLabel, getTaskStatusVariant } from "../labels";
import { TASK_STATUSES, type TaskStatus } from "../types";
import { ProjectTaskListSkeleton } from "./project-detail-skeleton";

const PAGE_SIZE = 20;

type ClientProjectTasksProps = {
	projectId: string;
};

export function ClientProjectTasks({ projectId }: ClientProjectTasksProps) {
	const { user } = useAuth();
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<TaskStatus | "">("");
	const [page, setPage] = useState(1);
	const searchId = useId();
	const statusId = useId();

	const query = useClientProjectTasks(user?.role, projectId, {
		page,
		limit: PAGE_SIZE,
		...(search ? { search } : {}),
		...(status ? { status } : {}),
	});

	function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPage(1);
		setSearch(searchInput.trim());
	}

	function handleStatusChange(nextStatus: TaskStatus | "") {
		setPage(1);
		setStatus(nextStatus);
	}

	const pagination = query.data?.pagination;
	const totalPages = Math.max(1, pagination?.totalPages ?? 1);
	const tasks = query.data?.tasks ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Tasks shared with you</CardTitle>
				<p className="text-sm text-muted-foreground">
					Read-only view of the tasks your team marked as client visible.
				</p>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<form
					className="flex flex-col gap-3 sm:flex-row sm:items-end"
					onSubmit={handleSearchSubmit}
				>
					<div className="flex flex-1 flex-col gap-1.5">
						<label className="text-sm font-medium" htmlFor={searchId}>
							Search tasks
						</label>
						<Input
							id={searchId}
							maxLength={200}
							placeholder="Search by title"
							type="search"
							value={searchInput}
							onChange={(event) => setSearchInput(event.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium" htmlFor={statusId}>
							Status
						</label>
						<select
							id={statusId}
							className="h-8 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
							value={status}
							onChange={(event) =>
								handleStatusChange(event.target.value as TaskStatus | "")
							}
						>
							<option value="">All statuses</option>
							{TASK_STATUSES.map((taskStatus) => (
								<option key={taskStatus} value={taskStatus}>
									{getTaskStatusLabel(taskStatus)}
								</option>
							))}
						</select>
					</div>
					<Button type="submit" variant="outline">
						<MagnifyingGlassIcon aria-hidden="true" />
						Search
					</Button>
				</form>

				{query.isPending ? <ProjectTaskListSkeleton /> : null}

				{query.isError ? (
					<QueryErrorState
						error={query.error}
						title="Unable to load tasks"
						onRetry={() => void query.refetch()}
					/>
				) : null}

				{query.isSuccess && tasks.length === 0 ? (
					<EmptyState
						title="No tasks to show"
						description="No client visible tasks match your current filters."
					/>
				) : null}

				{query.isSuccess && tasks.length > 0 ? (
					<ul className="flex flex-col gap-3">
						{tasks.map((task) => (
							<li key={task.id}>
								<Link
									className="flex flex-col gap-2 rounded-lg border bg-background p-4 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									href={`/projects/${projectId}/tasks/${task.id}`}
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<p className="font-medium">{task.title}</p>
										<Badge variant={getTaskStatusVariant(task.status)}>
											{getTaskStatusLabel(task.status)}
										</Badge>
									</div>
									<p
										className={cn(
											"text-sm text-muted-foreground",
											!task.description && "italic",
										)}
									>
										{task.description ?? "No description provided."}
									</p>
								</Link>
							</li>
						))}
					</ul>
				) : null}

				{query.isSuccess && pagination && pagination.total > 0 ? (
					<div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
						<p className="text-xs text-muted-foreground">
							Showing {(pagination.page - 1) * pagination.limit + 1}-
							{Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
							of {pagination.total}
						</p>
						<div className="flex items-center gap-2">
							<Button
								disabled={pagination.page <= 1}
								type="button"
								variant="outline"
								onClick={() => setPage((current) => Math.max(1, current - 1))}
							>
								Previous
							</Button>
							<span className="text-xs text-muted-foreground">
								Page {pagination.page} of {totalPages}
							</span>
							<Button
								disabled={pagination.page >= totalPages}
								type="button"
								variant="outline"
								onClick={() =>
									setPage((current) => Math.min(totalPages, current + 1))
								}
							>
								Next
							</Button>
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
