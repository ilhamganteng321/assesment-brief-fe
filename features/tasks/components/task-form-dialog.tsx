"use client";

import { CheckIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { useCallback, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogRoot,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/provider";
import type { UserRole } from "@/features/auth/types";
import { zodResolver } from "@/features/auth/zod-resolver";
import {
	getApiErrorMessage,
	isConcurrentModificationError,
} from "@/lib/api/error";
import { useCreateTask, useUpdateTask } from "../hooks";
import {
	getTaskDepartmentLabel,
	getTaskPriorityLabel,
	getTaskStatusLabel,
} from "../labels";
import { getEditableTaskFields } from "../permissions";
import {
	findAssigneeDepartmentConflict,
	hasTaskFormChanges,
	type TaskFormField,
	type TaskFormValues,
	taskFormSchema,
	toCreateTaskPayload,
	toTaskFormValues,
	toUpdateTaskPayload,
} from "../schemas";
import {
	TASK_DEPARTMENTS,
	TASK_PRIORITIES,
	TASK_STATUSES,
	type Task,
	type TaskAssigneeSummary,
	type TaskDepartment,
} from "../types";

type TaskFormDialogProps = {
	role: UserRole | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string;
	task?: Task;
	/** Eligible assignees, used to keep department and assignee consistent. */
	assignees?: readonly TaskAssigneeSummary[];
};

export function TaskFormDialog({
	role,
	open,
	onOpenChange,
	projectId,
	task,
	assignees = [],
}: TaskFormDialogProps) {
	const { user } = useAuth();
	const currentUserId = user?.id;
	const isEditing = task !== undefined;
	const createTask = useCreateTask(role);
	const updateTask = useUpdateTask();
	const createDefaults = toTaskFormValues();
	const editDefaults = toTaskFormValues(
		task === undefined
			? {}
			: {
					title: task.title,
					description: task.description,
					assignedToId: task.assignedToId,
					status: task.status,
					priority: task.priority,
					department: task.department,
					clientVisible: task.clientVisible,
				},
	);
	const defaults = isEditing ? editDefaults : createDefaults;

	// Which fields this viewer may change. A PM editing a task gets the lot; an
	// internal user assigned to it gets the title and the status only. The
	// remaining inputs stay on the form as read-only so the values are still
	// visible, but they cannot be edited and they never reach the payload.
	const editableFields = useMemo(() => {
		if (task === undefined) {
			return new Set<TaskFormField>([
				"title",
				"description",
				"assignedToId",
				"status",
				"priority",
				"department",
				"clientVisible",
			]);
		}
		return getEditableTaskFields({ role, id: currentUserId }, task);
	}, [task, role, currentUserId]);
	const isEditable = useCallback(
		(field: TaskFormField) => editableFields.has(field),
		[editableFields],
	);

	const {
		control,
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<TaskFormValues>({
		resolver: zodResolver(taskFormSchema),
		defaultValues: defaults,
		values: defaults,
	});

	// `useWatch` instead of `watch` so React Compiler can memoize the component.
	const assignedToId = useWatch({ control, name: "assignedToId" }) ?? "";
	const department = useWatch({ control, name: "department" });
	const assigneeDepartments = useMemo(
		() => new Map(assignees.map((a) => [a.id, a.department])),
		[assignees],
	);
	const conflict = findAssigneeDepartmentConflict({
		assignedToId,
		department: department as TaskDepartment,
		assigneeDepartments,
	});

	const isPending =
		(isEditing ? updateTask.isPending : createTask.isPending) || isSubmitting;
	const mutation = isEditing ? updateTask : createTask;
	const errorMessage = mutation.error
		? getApiErrorMessage(mutation.error)
		: null;
	// A conflict is not just a failed save: the refetch that follows it replaced
	// the form values with the row that won, so the unsaved edits are gone and
	// the version is now current. Saying so is the only honest way to ask the
	// user to review the new state before trying again.
	const versionConflict =
		mutation.error !== null && isConcurrentModificationError(mutation.error);

	function handleOpenChange(nextOpen: boolean) {
		if (!isPending) {
			if (!nextOpen) {
				reset(defaults);
			}
			onOpenChange(nextOpen);
		}
	}

	async function onSubmit(values: TaskFormValues) {
		if (conflict !== null) {
			return;
		}

		try {
			if (task !== undefined) {
				if (!hasTaskFormChanges(values, editDefaults, editableFields)) {
					handleOpenChange(false);
					return;
				}

				await updateTask.mutateAsync({
					taskId: task.id,
					projectId: task.projectId,
					payload: toUpdateTaskPayload(
						values,
						task.version,
						editDefaults,
						editableFields,
					),
				});
			} else {
				await createTask.mutateAsync(toCreateTaskPayload(values, projectId));
			}
			handleOpenChange(false);
		} catch {
			return;
		}
	}

	const conflictMessage =
		conflict === "assignee"
			? "That assignee is not a project member."
			: conflict === "department"
				? "The assignee belongs to a different department than the task."
				: null;
	// An assigned task cannot be unassigned through the update payload, so the
	// empty option is only offered when clearing it is actually possible.
	const canClearAssignee = !isEditing || !editDefaults.assignedToId;
	// Locked fields are rendered but not editable, with the reason spelled out
	// rather than leaving a dead input that looks like a bug.
	const lockedMessage = isEditing
		? "Only a product manager can change this field."
		: null;

	return (
		<DialogRoot onOpenChange={handleOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEditing ? "Edit task" : "Create task"}</DialogTitle>
					<DialogDescription>
						{isEditing
							? "Update the task scope, ownership and status."
							: "Add a task to this project."}
					</DialogDescription>
				</DialogHeader>
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-2">
						<Label htmlFor="task-title">Title</Label>
						<Input
							aria-invalid={errors.title !== undefined}
							autoFocus
							disabled={!isEditable("title")}
							id="task-title"
							placeholder="Ship the search endpoint"
							{...register("title")}
						/>
						{errors.title ? (
							<p className="text-sm text-destructive">{errors.title.message}</p>
						) : null}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="task-description">Description</Label>
						<Textarea
							aria-invalid={errors.description !== undefined}
							disabled={!isEditable("description")}
							id="task-description"
							placeholder="Optional task summary"
							{...register("description")}
						/>
						{errors.description ? (
							<p className="text-sm text-destructive">
								{errors.description.message}
							</p>
						) : null}
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="task-department">Department</Label>
							<select
								aria-invalid={errors.department !== undefined}
								className="h-9 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60"
								disabled={!isEditable("department")}
								id="task-department"
								{...register("department")}
							>
								{TASK_DEPARTMENTS.map((value) => (
									<option key={value} value={value}>
										{getTaskDepartmentLabel(value)}
									</option>
								))}
							</select>
							{errors.department ? (
								<p className="text-sm text-destructive">
									{errors.department.message}
								</p>
							) : null}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="task-priority">Priority</Label>
							<select
								aria-invalid={errors.priority !== undefined}
								className="h-9 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60"
								disabled={!isEditable("priority")}
								id="task-priority"
								{...register("priority")}
							>
								{TASK_PRIORITIES.map((value) => (
									<option key={value} value={value}>
										{getTaskPriorityLabel(value)}
									</option>
								))}
							</select>
							{errors.priority ? (
								<p className="text-sm text-destructive">
									{errors.priority.message}
								</p>
							) : null}
						</div>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="task-assignee">Assignee</Label>
							<select
								aria-invalid={
									errors.assignedToId !== undefined || conflict !== null
								}
								className="h-9 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60"
								disabled={!isEditable("assignedToId")}
								id="task-assignee"
								{...register("assignedToId")}
							>
								{/* The update endpoint has no way to express "clear the
								    assignee", so an assigned task must keep one to avoid
								    submitting a no-op update. */}
								{canClearAssignee ? <option value="">Unassigned</option> : null}
								{assignees.map((assignee) => (
									<option key={assignee.id} value={assignee.id}>
										{`${assignee.name} (${getTaskDepartmentLabel(assignee.department)})`}
									</option>
								))}
							</select>
							{conflictMessage !== null ? (
								<p className="text-sm text-destructive" role="alert">
									{conflictMessage}
								</p>
							) : errors.assignedToId ? (
								<p className="text-sm text-destructive">
									{errors.assignedToId.message}
								</p>
							) : null}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="task-status">Status</Label>
							<select
								aria-invalid={errors.status !== undefined}
								className="h-9 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60"
								disabled={!isEditable("status")}
								id="task-status"
								{...register("status")}
							>
								{TASK_STATUSES.map((value) => (
									<option key={value} value={value}>
										{getTaskStatusLabel(value)}
									</option>
								))}
							</select>
							{errors.status ? (
								<p className="text-sm text-destructive">
									{errors.status.message}
								</p>
							) : null}
						</div>
					</div>
					<label className="flex items-center gap-2 text-sm">
						<input
							className="size-4 rounded border disabled:cursor-not-allowed disabled:opacity-60"
							disabled={!isEditable("clientVisible")}
							id="task-client-visible"
							type="checkbox"
							{...register("clientVisible")}
						/>
						Visible to client
					</label>
					{isEditing && !isEditable("description") && lockedMessage !== null ? (
						<p className="text-xs text-muted-foreground">{lockedMessage}</p>
					) : null}
					{versionConflict && isEditing && task !== undefined ? (
						<p className="text-sm text-destructive" role="alert">
							{`This task was updated by another user. The form now shows version ${String(
								task.version,
							)}, so review what changed and re-apply your edits before saving again.`}
						</p>
					) : errorMessage !== null ? (
						<p className="text-sm text-destructive" role="alert">
							{errorMessage}
						</p>
					) : null}
					<DialogFooter>
						<Button
							disabled={isPending}
							render={<DialogClose />}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button disabled={isPending || conflict !== null} type="submit">
							{isPending ? (
								"Saving..."
							) : isEditing ? (
								<CheckIcon aria-hidden="true" />
							) : (
								<PaperPlaneTiltIcon aria-hidden="true" />
							)}
							{isEditing ? "Save changes" : "Create task"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
