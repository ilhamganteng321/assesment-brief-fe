"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { UserRole } from "@/features/auth/types";

import { getProjectStatusDescription } from "../labels";
import { getAvailableLifecycleActions } from "../permissions";
import type { Project, ProjectStatus } from "../types";
import { ProjectLifecycleDialog } from "./project-lifecycle-dialog";
import { ProjectStatusBadge } from "./project-status-badge";

/**
 * A project's place in its lifecycle, and the one step it can take from there.
 *
 * This is a sequence of confirmed, one-way moves, not a field. Only the move the
 * lifecycle actually permits is offered, so there is no "Archive" on a project
 * that is not finished and no "Reopen" anywhere — reopening is not a thing the
 * product does, and offering a control the server would refuse with 409 would be
 * a lie about what is available.
 *
 * Who sees a control at all follows the same rule: a project manager gets the
 * single next step, an internal user and a client guest get none. The server
 * re-checks both the role and the transition on every request; this only keeps
 * the interface from offering what would be refused.
 */
export function ProjectStatusSettings({
	role,
	project,
}: {
	role: UserRole | undefined;
	project: Project;
}) {
	const [target, setTarget] = useState<ProjectStatus | null>(null);
	const actions = getAvailableLifecycleActions({ role }, project);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Project status</CardTitle>
				<CardDescription>
					{getProjectStatusDescription(project.status)} A project moves forward
					one step at a time and archiving is final.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<ProjectStatusBadge status={project.status} />

				{actions.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{project.status === "ARCHIVED"
							? "No further lifecycle actions are available for an archived project."
							: "You do not have permission to change this project's status."}
					</p>
				) : (
					<div className="flex flex-wrap gap-2">
						{actions.map((action) => (
							<Button
								key={action.targetStatus}
								type="button"
								variant={
									action.targetStatus === "ARCHIVED" ? "outline" : "default"
								}
								onClick={() => setTarget(action.targetStatus)}
							>
								{action.label}
							</Button>
						))}
					</div>
				)}
			</CardContent>

			{target === null ? null : (
				<ProjectLifecycleDialog
					onOpenChange={(nextOpen) => {
						if (!nextOpen) {
							setTarget(null);
						}
					}}
					open
					project={project}
					targetStatus={target}
				/>
			)}
		</Card>
	);
}
