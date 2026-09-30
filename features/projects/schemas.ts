import { z } from "zod";

import type { CreateProjectPayload } from "./types";
import { PROJECT_STATUSES } from "./types";

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

/**
 * The project settings form: the three editable metadata fields.
 *
 * Mirrors the backend's own rules rather than inventing its own, so a value the
 * form accepts is a value the API accepts. The status is absent on purpose: a
 * project's position is moved through the lifecycle controls, which confirm
 * first, and not as a field that could be set by accident in a rename.
 */
export const projectSettingsFormSchema = z.object({
	name: nameSchema,
	description: descriptionSchema,
	clientName: clientNameSchema,
});

export type ProjectSettingsFormValues = z.infer<
	typeof projectSettingsFormSchema
>;

/**
 * The create form. It carries a status because a project is *born* into one —
 * that is not a lifecycle move, there is nothing to transition from. Every later
 * move goes through the status endpoint.
 */
export const createProjectFormSchema = projectSettingsFormSchema.extend({
	status: statusSchema,
});

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

export function toCreateProjectPayload(
	values: CreateProjectFormValues,
): CreateProjectPayload {
	const description = values.description.trim();
	const clientName = values.clientName.trim();

	return {
		name: values.name.trim(),
		status: values.status,
		...(description.length > 0 ? { description } : {}),
		...(clientName.length > 0 ? { clientName } : {}),
	};
}

/**
 * The settings payload.
 *
 * Every field is sent, including the ones the user left blank: an emptied client
 * name has to reach the server to clear the column, and omitting it would make
 * "remove the client" impossible to express.
 */
export function toProjectSettingsPayload(values: ProjectSettingsFormValues): {
	name: string;
	description?: string;
	clientName?: string;
} {
	const description = values.description.trim();
	const clientName = values.clientName.trim();

	return {
		name: values.name.trim(),
		...(description.length > 0 ? { description } : {}),
		...(clientName.length > 0 ? { clientName } : {}),
	};
}

/** Reads a project into the shape the settings form is bound to. */
export function toProjectSettingsValues(project: {
	name: string;
	description: string | null;
	clientName: string | null;
}): ProjectSettingsFormValues {
	return {
		name: project.name,
		description: project.description ?? "",
		clientName: project.clientName ?? "",
	};
}
