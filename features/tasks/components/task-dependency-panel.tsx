"use client";

import { TrashIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/features/auth/provider";
import { getApiErrorMessage } from "@/lib/api/error";

import {
	getDependencyCandidates,
	getUnfinishedDependencies,
} from "../dependency";
import {
	useCreateTaskDependency,
	useDeleteTaskDependency,
	useTaskDependencies,
	useTaskList,
} from "../hooks";
import { getTaskStatusLabel } from "../labels";
import type { Task } from "../types";

const SELECT_CLASS =
	"h-9 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type TaskDependencyPanelProps = {
	task: Task;
};

/**
 * The prerequisite graph of one task, plus the PM-only controls that change it.
 * Removal uses the prerequisite id exactly as the server lists it, so the
 * frontend and the backend agree on what a `dependencyId` is.
 */
export function TaskDependencyPanel({ task }: TaskDependencyPanelProps) {
	const { user } = useAuth();
	const role = user?.role;
	const canManage = role === "PM";
	const dependenciesQuery = useTaskDependencies(role, task.id);
	const createDependency = useCreateTaskDependency(role, task.id);
	const deleteDependency = useDeleteTaskDependency(role, task.id);
	const [selectedDependencyId, setSelectedDependencyId] = useState("");

	// The candidate list needs the project's other tasks, which the task list
	// query already scopes server side.
	const candidatesQuery = useTaskList(role, {
		filters: { projectId: task.projectId },
		rows: 100,
		orderKey: "title",
		orderRule: "asc",
	});

	const dependencies = useMemo(
		() => dependenciesQuery.data?.dependencies ?? [],
		[dependenciesQuery.data],
	);
	const candidates = useMemo(
		() =>
			getDependencyCandidates(candidatesQuery.data?.tasks ?? [], {
				taskId: task.id,
				projectId: task.projectId,
				existingDependencies: dependencies,
			}),
		[candidatesQuery.data?.tasks, dependencies, task.id, task.projectId],
	);
	const unfinished = getUnfinishedDependencies(dependencies);
	const isMutating = createDependency.isPending || deleteDependency.isPending;

	const submit = () => {
		if (selectedDependencyId.length === 0) {
			return;
		}

		createDependency.mutate(
			{ dependencyTaskId: selectedDependencyId },
			{ onSuccess: () => setSelectedDependencyId("") },
		);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Dependencies</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{dependenciesQuery.isPending ? (
					<p className="text-sm text-muted-foreground">
						Loading dependencies...
					</p>
				) : dependenciesQuery.isError ? (
					<p className="text-sm text-destructive">
						{getApiErrorMessage(dependenciesQuery.error)}
					</p>
				) : dependencies.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						This task has no prerequisites and can start at any time.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{dependencies.map((dependency) => (
							<li
								key={dependency.id}
								className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2"
							>
								<span className="flex min-w-0 flex-col">
									{dependency.deleted ? (
										<span className="text-sm text-muted-foreground line-through">
											{dependency.title}
										</span>
									) : (
										<Link
											className="text-sm font-medium hover:underline"
											href={`/tasks/${dependency.id}`}
										>
											{dependency.title}
										</Link>
									)}
									<span className="text-xs text-muted-foreground">
										{dependency.deleted
											? "Deleted prerequisite"
											: getTaskStatusLabel(dependency.status)}
									</span>
								</span>
								<span className="flex items-center gap-2">
									{dependency.deleted ? (
										<Badge variant="muted">Removed</Badge>
									) : dependency.status !== "DONE" ? (
										<Badge variant="destructive">Outstanding</Badge>
									) : (
										<Badge variant="secondary">Completed</Badge>
									)}
									{canManage ? (
										<Button
											className="min-h-8"
											size="sm"
											type="button"
											variant="outline"
											disabled={isMutating}
											onClick={() => deleteDependency.mutate(dependency.id)}
										>
											<TrashIcon aria-hidden="true" />
											Remove
										</Button>
									) : null}
								</span>
							</li>
						))}
					</ul>
				)}

				{unfinished.length > 0 ? (
					<p className="text-sm text-muted-foreground">
						{unfinished.length === 1
							? "1 prerequisite must be completed before this task can start."
							: `${unfinished.length} prerequisites must be completed before this task can start.`}
					</p>
				) : null}

				{canManage ? (
					<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
						<label className="flex flex-1 flex-col gap-1 text-sm">
							<span className="text-muted-foreground">Add prerequisite</span>
							<select
								aria-label="Select a prerequisite"
								className={SELECT_CLASS}
								value={selectedDependencyId}
								onChange={(event) =>
									setSelectedDependencyId(event.target.value)
								}
							>
								<option value="">Select a task in this project</option>
								{candidates.map((candidate) => (
									<option key={candidate.id} value={candidate.id}>
										{`${candidate.title} (${getTaskStatusLabel(candidate.status)})`}
									</option>
								))}
							</select>
						</label>
						<Button
							className="min-h-9"
							type="button"
							disabled={selectedDependencyId.length === 0 || isMutating}
							onClick={submit}
						>
							Add dependency
						</Button>
					</div>
				) : null}

				{createDependency.isError ? (
					<p className="text-sm text-destructive">
						{getApiErrorMessage(createDependency.error)}
					</p>
				) : null}
				{deleteDependency.isError ? (
					<p className="text-sm text-destructive">
						{getApiErrorMessage(deleteDependency.error)}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
