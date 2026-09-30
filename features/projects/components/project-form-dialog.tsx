"use client";

import { type UseFormReturn, useForm } from "react-hook-form";

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
	type ProjectSettingsFormValues,
	projectSettingsFormSchema,
	toCreateProjectPayload,
	toProjectSettingsPayload,
	toProjectSettingsValues,
} from "../schemas";
import { PROJECT_STATUSES, type Project } from "../types";

type ProjectFormDialogProps = {
	role: UserRole | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Present when editing. Its absence means the dialog is creating. */
	project?: Project;
};

function toCreateDefaults(
	project: Project | undefined,
): CreateProjectFormValues {
	return {
		name: project?.name ?? "",
		description: project?.description ?? "",
		clientName: project?.clientName ?? "",
		status: project?.status ?? "PLANNING",
	};
}

/**
 * Create a project, or edit one's metadata.
 *
 * The create form carries a status because a project is *born* into one — that is
 * not a lifecycle move, there is nothing to transition from. The edit form does
 * not: once a project exists its position is moved through the confirmed
 * lifecycle actions, so a rename can never double as a status change and there is
 * no way to reach ARCHIVED by accident from a text field.
 *
 * Two forms rather than one with an optional status, because creating and editing
 * genuinely have different fields. A single form with an optional status would
 * either silently drop the status on save or send `undefined` for a field the API
 * treats as a lifecycle move.
 *
 * Both forms live inside the dialog rather than beside it so the submit button in
 * the dialog footer can drive them, which keeps one focus trap and one set of
 * keyboard affordances.
 */
export function ProjectFormDialog({
	role,
	open,
	onOpenChange,
	project,
}: ProjectFormDialogProps) {
	const isEditing = project !== undefined;
	const createProject = useCreateProject(role);
	const updateProject = useUpdateProject(role);

	// Both forms are always mounted so their state survives the dialog opening and
	// closing; only the matching one is rendered. A form that remounts each time
	// would lose what the user had typed if the dialog closed unexpectedly.
	const createForm = useForm<CreateProjectFormValues>({
		resolver: zodResolver(createProjectFormSchema),
		defaultValues: toCreateDefaults(project),
		values: toCreateDefaults(project),
	});
	const editForm = useForm<ProjectSettingsFormValues>({
		resolver: zodResolver(projectSettingsFormSchema),
		defaultValues: toProjectSettingsValues(project ?? FALLBACK_PROJECT),
		...(project === undefined
			? {}
			: { values: toProjectSettingsValues(project) }),
	});

	const mutation = isEditing ? updateProject : createProject;
	const isPending =
		mutation.isPending ||
		createForm.formState.isSubmitting ||
		editForm.formState.isSubmitting;

	function handleOpenChange(nextOpen: boolean) {
		if (isPending) {
			return;
		}
		if (!nextOpen) {
			createForm.reset(toCreateDefaults(project));
			if (project !== undefined) {
				editForm.reset(toProjectSettingsValues(project));
			}
		}
		onOpenChange(nextOpen);
	}

	async function onCreate(values: CreateProjectFormValues) {
		await createProject.mutateAsync(toCreateProjectPayload(values));
		handleOpenChange(false);
	}

	async function onEdit(values: ProjectSettingsFormValues) {
		if (project === undefined) {
			return;
		}
		await updateProject.mutateAsync({
			projectId: project.id,
			payload: toProjectSettingsPayload(values),
		});
		handleOpenChange(false);
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
							? "Update the project's name, summary and client."
							: "Add a project to the workspace. Its lifecycle is managed from the project page once it exists."}
					</DialogDescription>
				</DialogHeader>

				{isEditing && project !== undefined ? (
					<EditForm
						form={editForm}
						projectName={project.name}
						onSubmit={onEdit}
					/>
				) : (
					<CreateForm form={createForm} onSubmit={onCreate} />
				)}

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
					<Button
						disabled={isPending}
						type="submit"
						form={isEditing ? PROJECT_EDIT_FORM_ID : PROJECT_CREATE_FORM_ID}
					>
						{isPending
							? "Saving..."
							: isEditing
								? "Save changes"
								: "Create project"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</DialogRoot>
	);
}

/**
 * A blank project, used only to give the edit form a shape before one is chosen.
 *
 * Never rendered on its own: the create form is what a dialog with no project
 * shows. It exists so `useForm` gets a concrete value set to bind to.
 */
const FALLBACK_PROJECT: Project = {
	id: "",
	name: "",
	description: null,
	clientName: null,
	status: "PLANNING",
	createdAt: "",
	updatedAt: "",
};

const PROJECT_CREATE_FORM_ID = "project-create-form";
const PROJECT_EDIT_FORM_ID = "project-edit-form";

function CreateForm({
	form,
	onSubmit,
}: {
	form: UseFormReturn<CreateProjectFormValues>;
	onSubmit: (values: CreateProjectFormValues) => Promise<void>;
}) {
	const { errors } = form.formState;

	return (
		<form
			className="grid gap-4"
			id={PROJECT_CREATE_FORM_ID}
			onSubmit={form.handleSubmit(onSubmit)}
		>
			<div className="grid gap-2">
				<Label htmlFor="project-name">Name</Label>
				<Input
					aria-invalid={errors.name !== undefined}
					autoFocus
					id="project-name"
					placeholder="Aurora Retail Replatform"
					{...form.register("name")}
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
					{...form.register("clientName")}
				/>
				{errors.clientName ? (
					<p className="text-sm text-destructive">
						{errors.clientName.message}
					</p>
				) : null}
			</div>
			<div className="grid gap-2">
				<Label htmlFor="project-status">Starting status</Label>
				<select
					aria-invalid={errors.status !== undefined}
					className="h-9 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive"
					id="project-status"
					{...form.register("status")}
				>
					{PROJECT_STATUSES.map((status) => (
						<option key={status} value={status}>
							{getProjectStatusLabel(status)}
						</option>
					))}
				</select>
				{errors.status ? (
					<p className="text-sm text-destructive">{errors.status.message}</p>
				) : null}
			</div>
			<div className="grid gap-2">
				<Label htmlFor="project-description">Description</Label>
				<Textarea
					aria-invalid={errors.description !== undefined}
					id="project-description"
					placeholder="Optional project summary"
					{...form.register("description")}
				/>
				{errors.description ? (
					<p className="text-sm text-destructive">
						{errors.description.message}
					</p>
				) : null}
			</div>
		</form>
	);
}

function EditForm({
	form,
	projectName,
	onSubmit,
}: {
	form: UseFormReturn<ProjectSettingsFormValues>;
	/** Not shown; the dialog title already names the project. */
	projectName: string;
	onSubmit: (values: ProjectSettingsFormValues) => Promise<void>;
}) {
	const { errors } = form.formState;

	return (
		<form
			className="grid gap-4"
			id={PROJECT_EDIT_FORM_ID}
			onSubmit={form.handleSubmit(onSubmit)}
		>
			<div className="grid gap-2">
				<Label htmlFor="project-edit-name">Name</Label>
				<Input
					aria-invalid={errors.name !== undefined}
					autoFocus
					id="project-edit-name"
					{...form.register("name")}
				/>
				{errors.name ? (
					<p className="text-sm text-destructive">{errors.name.message}</p>
				) : null}
			</div>
			<div className="grid gap-2">
				<Label htmlFor="project-edit-client">Client name</Label>
				<Input
					aria-invalid={errors.clientName !== undefined}
					id="project-edit-client"
					placeholder="Optional"
					{...form.register("clientName")}
				/>
				{errors.clientName ? (
					<p className="text-sm text-destructive">
						{errors.clientName.message}
					</p>
				) : null}
			</div>
			<div className="grid gap-2">
				<Label htmlFor="project-edit-description">Description</Label>
				<Textarea
					aria-invalid={errors.description !== undefined}
					id="project-edit-description"
					placeholder="Optional project summary"
					{...form.register("description")}
				/>
				{errors.description ? (
					<p className="text-sm text-destructive">
						{errors.description.message}
					</p>
				) : null}
			</div>
			<span className="sr-only">{`Editing ${projectName}`}</span>
		</form>
	);
}
