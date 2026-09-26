"use client";

import { useForm } from "react-hook-form";
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
import type { UserRole } from "@/features/auth/types";
import { zodResolver } from "@/features/auth/zod-resolver";
import { getApiErrorMessage } from "@/lib/api/error";
import { useCreateProject, useUpdateProject } from "../hooks";
import { getProjectStatusLabel } from "../labels";
import {
	type CreateProjectFormValues,
	createProjectFormSchema,
	toCreateProjectPayload,
	toUpdateProjectPayload,
} from "../schemas";
import { PROJECT_STATUSES, type Project } from "../types";

type ProjectFormDialogProps = {
	role: UserRole | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	project?: Project;
};

function getDefaultValues(project?: Project): CreateProjectFormValues {
	return {
		name: project?.name ?? "",
		description: project?.description ?? "",
		clientName: project?.clientName ?? "",
		status: project?.status ?? "PLANNING",
	};
}

export function ProjectFormDialog({
	role,
	open,
	onOpenChange,
	project,
}: ProjectFormDialogProps) {
	const isEditing = project !== undefined;
	const createProject = useCreateProject(role);
	const updateProject = useUpdateProject(role);
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<CreateProjectFormValues>({
		resolver: zodResolver(createProjectFormSchema),
		defaultValues: getDefaultValues(project),
		values: getDefaultValues(project),
	});
	const mutation = isEditing ? updateProject : createProject;
	const isPending = mutation.isPending || isSubmitting;

	function handleOpenChange(nextOpen: boolean) {
		if (!isPending) {
			if (!nextOpen) {
				reset(getDefaultValues(project));
			}
			onOpenChange(nextOpen);
		}
	}

	async function onSubmit(values: CreateProjectFormValues) {
		try {
			if (project !== undefined) {
				await updateProject.mutateAsync({
					projectId: project.id,
					payload: toUpdateProjectPayload(values),
				});
			} else {
				await createProject.mutateAsync(toCreateProjectPayload(values));
			}
			handleOpenChange(false);
		} catch {
			return;
		}
	}

	const errorMessage = mutation.error
		? getApiErrorMessage(mutation.error)
		: null;

	return (
		<DialogRoot onOpenChange={handleOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Edit project" : "Create project"}
					</DialogTitle>
					<DialogDescription>
						{isEditing
							? "Update the project details, client and status."
							: "Add a project to the workspace."}
					</DialogDescription>
				</DialogHeader>
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-2">
						<Label htmlFor="project-name">Name</Label>
						<Input
							aria-invalid={errors.name !== undefined}
							autoFocus
							id="project-name"
							placeholder="Aurora Retail Replatform"
							{...register("name")}
						/>
						{errors.name ? (
							<p className="text-sm text-destructive">{errors.name.message}</p>
						) : null}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="project-client">Client name</Label>
						<Input
							aria-invalid={errors.clientName !== undefined}
							id="project-client"
							placeholder="Optional"
							{...register("clientName")}
						/>
						{errors.clientName ? (
							<p className="text-sm text-destructive">
								{errors.clientName.message}
							</p>
						) : null}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="project-status">Status</Label>
						<select
							aria-invalid={errors.status !== undefined}
							className="h-9 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive"
							id="project-status"
							{...register("status")}
						>
							{PROJECT_STATUSES.map((status) => (
								<option key={status} value={status}>
									{getProjectStatusLabel(status)}
								</option>
							))}
						</select>
						{errors.status ? (
							<p className="text-sm text-destructive">
								{errors.status.message}
							</p>
						) : null}
					</div>
					<div className="grid gap-2">
						<Label htmlFor="project-description">Description</Label>
						<Textarea
							aria-invalid={errors.description !== undefined}
							id="project-description"
							placeholder="Optional project summary"
							{...register("description")}
						/>
						{errors.description ? (
							<p className="text-sm text-destructive">
								{errors.description.message}
							</p>
						) : null}
					</div>
					{errorMessage ? (
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
						<Button disabled={isPending} type="submit">
							{isPending
								? "Saving..."
								: isEditing
									? "Save changes"
									: "Create project"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
