import {
	ArchiveIcon,
	BuildingsIcon,
	CalendarBlankIcon,
	PencilSimpleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

import { getProjectStatusLabel, getProjectStatusVariant } from "../labels";
import type { Project } from "../types";

type ProjectCardProps = {
	project: Project;
	canEdit?: boolean;
	canArchive?: boolean;
	onEdit?: () => void;
	onArchive?: () => void;
};

export function ProjectCard({
	project,
	canEdit = false,
	canArchive = false,
	onEdit,
	onArchive,
}: ProjectCardProps) {
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
					<Badge variant={getProjectStatusVariant(project.status)}>
						{getProjectStatusLabel(project.status)}
					</Badge>
					{project.clientName ? (
						<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
							<BuildingsIcon aria-hidden="true" />
							{project.clientName}
						</span>
					) : null}
				</div>
				<div className="flex items-center justify-between gap-2">
					<p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
						<CalendarBlankIcon aria-hidden="true" />
						Updated {formatDate(project.updatedAt)}
					</p>
					{canEdit || canArchive ? (
						<div className="relative z-10 flex items-center gap-1">
							{canEdit && onEdit ? (
								<Button
									aria-label={`Edit ${project.name}`}
									size="icon-sm"
									type="button"
									variant="ghost"
									onClick={onEdit}
								>
									<PencilSimpleIcon aria-hidden="true" />
								</Button>
							) : null}
							{canArchive && onArchive ? (
								<Button
									aria-label={`Archive ${project.name}`}
									size="icon-sm"
									type="button"
									variant="ghost"
									onClick={onArchive}
								>
									<ArchiveIcon aria-hidden="true" />
								</Button>
							) : null}
						</div>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}
