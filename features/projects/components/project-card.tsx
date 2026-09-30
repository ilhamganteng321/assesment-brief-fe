"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

import type { ProjectStatus } from "../types";
import { ProjectActionMenu } from "./project-action-menu";
import { ProjectStatusBadge } from "./project-status-badge";

export type ProjectCardAction = {
	label: string;
	onSelect: () => void;
	destructive?: boolean;
};

/**
 * The actions to offer for a project, given where it is in its lifecycle.
 *
 * A pure builder so the rules can be tested without rendering, and so the card
 * and any other surface decide the same thing. A `null` `nextStatus` means the
 * lifecycle has nowhere left to go — an archived project — and no lifecycle entry
 * is produced. There is no "Restore" or "Reopen": that workflow does not exist,
 * and offering a control the server would answer with 409 would misrepresent the
 * product.
 */
export function buildProjectCardActions(input: {
	canEdit: boolean;
	canDelete: boolean;
	nextStatus: ProjectStatus | null;
	onEdit: () => void;
	onDelete: () => void;
	onMoveTo: (status: ProjectStatus) => void;
}): ProjectCardAction[] {
	const actions: ProjectCardAction[] = [];

	if (input.canEdit) {
		actions.push({ label: "Edit project", onSelect: input.onEdit });
	}

	if (input.nextStatus !== null) {
		actions.push({
			label:
				input.nextStatus === "ARCHIVED"
					? "Archive project"
					: "Mark as completed",
			onSelect: () => input.onMoveTo(input.nextStatus as ProjectStatus),
		});
	}

	if (input.canDelete) {
		actions.push({
			label: "Delete project",
			onSelect: input.onDelete,
			destructive: true,
		});
	}

	return actions;
}

/**
 * One project in the list.
 *
 * Shows the name, the client, the status and how recently it changed, with the
 * progress the server computed alongside. The actions live behind a menu because
 * what is available depends on the project's lifecycle: an active project can be
 * completed or deleted, a completed one can only be archived, and an archived one
 * offers nothing but the link through to its settings.
 *
 * The whole card is not a link. The title is, and it carries an overlay that
 * covers the card, so the menu stays clickable and the only thing that navigates
 * is the name — which is the accessible, predictable target.
 */
export function ProjectCard({
	project,
	actions = [],
	progressPercentage,
}: {
	project: {
		id: string;
		name: string;
		description: string | null;
		clientName: string | null;
		status: ProjectStatus;
		updatedAt: string;
	};
	actions?: readonly ProjectCardAction[];
	/** The server's figure. Omitted where a list has not been given one. */
	progressPercentage?: number;
}) {
	return (
		<Card
			size="sm"
			className="relative transition-colors hover:border-primary/40"
		>
			<CardHeader>
				<CardTitle>
					<Link
						className="rounded-sm after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						href={`/projects/${project.id}`}
					>
						{project.name}
					</Link>
				</CardTitle>
				<p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
					{project.description ?? "No description provided."}
				</p>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<ProjectStatusBadge status={project.status} />
					{project.clientName ? (
						<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
							{project.clientName}
						</span>
					) : null}
				</div>

				{progressPercentage === undefined ? null : (
					<p className="text-xs text-muted-foreground">
						{`${String(progressPercentage)}% complete`}
					</p>
				)}

				<div className="flex items-center justify-between gap-2">
					<p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
						Updated {formatDate(project.updatedAt)}
					</p>
					{actions.length === 0 ? null : (
						<div className="relative z-10">
							<ProjectActionMenu actions={actions} projectName={project.name} />
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
