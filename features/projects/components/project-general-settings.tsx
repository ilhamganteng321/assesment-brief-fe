"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UserRole } from "@/features/auth/types";
import { zodResolver } from "@/features/auth/zod-resolver";
import { getApiErrorMessage } from "@/lib/api/error";

import { useUpdateProject } from "../hooks";
import { isProjectReadOnly } from "../lifecycle";
import {
	type ProjectSettingsFormValues,
	projectSettingsFormSchema,
	toProjectSettingsPayload,
	toProjectSettingsValues,
} from "../schemas";
import type { Project } from "../types";

/**
 * The editable half of a project's metadata.
 *
 * Three fields and nothing else. The lifecycle is not here: a project's position
 * is moved by the confirmed actions in the status card below, so a rename can
 * never double as a status change and there is no way to reach ARCHIVED by
 * accident from a text field.
 *
 * The whole form is disabled once the project is archived, because the server
 * answers 409 PROJECT_ARCHIVED to any further edit. Rendering the fields inert
 * explains that state; leaving them live and letting the save fail would not.
 */
export function ProjectGeneralSettings({
	role,
	project,
}: {
	role: UserRole | undefined;
	project: Project;
}) {
	const updateProject = useUpdateProject(role);
	const [isSaved, setIsSaved] = useState(false);
	const isReadOnly = isProjectReadOnly(project.status);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<ProjectSettingsFormValues>({
		resolver: zodResolver(projectSettingsFormSchema),
		defaultValues: toProjectSettingsValues(project),
		// Rebuilt whenever the server sends a different project, so a save that
		// landed is reflected here rather than left looking unsaved.
		values: toProjectSettingsValues(project),
	});
	const isPending = updateProject.isPending || isSubmitting;
	const errorMessage = updateProject.error
		? getApiErrorMessage(updateProject.error)
		: null;

	async function onSubmit(values: ProjectSettingsFormValues) {
		setIsSaved(false);
		try {
			await updateProject.mutateAsync({
				projectId: project.id,
				payload: toProjectSettingsPayload(values),
			});
			setIsSaved(true);
		} catch {
			// Rendered below, with the form still holding what was typed.
			return;
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>General</CardTitle>
				<CardDescription>
					{isReadOnly
						? "This project is archived, so these details can no longer be changed."
						: "The project's name, summary and client. The project's lifecycle is managed separately."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<div className="grid gap-2">
						<Label htmlFor="project-settings-name">Name</Label>
						<Input
							aria-invalid={errors.name !== undefined}
							disabled={isReadOnly}
							id="project-settings-name"
							{...register("name")}
						/>
						{errors.name ? (
							<p className="text-sm text-destructive">{errors.name.message}</p>
						) : null}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="project-settings-client">Client name</Label>
						<Input
							aria-invalid={errors.clientName !== undefined}
							disabled={isReadOnly}
							id="project-settings-client"
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
						<Label htmlFor="project-settings-description">Description</Label>
						<Textarea
							aria-invalid={errors.description !== undefined}
							disabled={isReadOnly}
							id="project-settings-description"
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

					{/* The confirmation is a live region rather than a transient toast, so
					    a screen reader announces a save that changed nothing just as it
					    announces one that did. */}
					<p aria-live="polite" className="text-sm text-muted-foreground">
						{isSaved && !isDirty && errorMessage === null
							? "Project details saved."
							: null}
					</p>

					{isReadOnly ? null : (
						<Button
							className="justify-self-start"
							disabled={isPending}
							type="submit"
						>
							{isPending ? "Saving..." : "Save changes"}
						</Button>
					)}
				</form>
			</CardContent>
		</Card>
	);
}
