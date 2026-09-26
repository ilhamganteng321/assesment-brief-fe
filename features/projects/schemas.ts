import { z } from "zod";

import { PROJECT_STATUSES, type ProjectStatus } from "./types";

const nameSchema = z
	.string()
	.trim()
	.min(1, "Project name is required.")
	.max(150, "Project name must be at most 150 characters.");

const descriptionSchema = z
	.string()
	.trim()
	.max(5000, "Description must be at most 5000 characters.");

const clientNameSchema = z
	.string()
	.trim()
	.max(150, "Client name must be at most 150 characters.");

const statusSchema = z.enum(PROJECT_STATUSES, {
	error: "Select a project status.",
});

export const createProjectFormSchema = z.object({
	name: nameSchema,
	description: descriptionSchema,
	clientName: clientNameSchema,
	status: statusSchema,
});

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

export const editProjectFormSchema = createProjectFormSchema;
export type EditProjectFormValues = CreateProjectFormValues;

export function toCreateProjectPayload(values: CreateProjectFormValues): {
	name: string;
	description?: string;
	clientName?: string;
	status: ProjectStatus;
} {
	const description = values.description.trim();
	const clientName = values.clientName.trim();

	return {
		name: values.name.trim(),
		status: values.status,
		...(description.length > 0 ? { description } : {}),
		...(clientName.length > 0 ? { clientName } : {}),
	};
}

export function toUpdateProjectPayload(values: EditProjectFormValues): {
	name: string;
	description?: string;
	clientName?: string;
	status: ProjectStatus;
} {
	return toCreateProjectPayload(values);
}
