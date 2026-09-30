import {
	ArchiveIcon,
	CheckCircleIcon,
	CircleDashedIcon,
	ClockIcon,
	type Icon,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";

import {
	getProjectStatusDescription,
	getProjectStatusLabel,
	getProjectStatusVariant,
} from "../labels";
import type { ProjectStatus } from "../types";

/**
 * A project's place in its lifecycle, as a badge.
 *
 * Status is never carried by colour alone. Every badge has a text label, and
 * each of the four states adds an icon with its own distinct shape, so a reader
 * who cannot separate the hues still learns that a project is archived and
 * read-only rather than merely a different shade of active. The full sentence
 * behind the label is available to assistive technology through the accessible
 * name, which is what stops "COMPLETED" and "ARCHIVED" collapsing into one
 * undifferentiated grey swatch in a list.
 */
const projectStatusIcons: Readonly<Record<ProjectStatus, Icon>> = {
	PLANNING: CircleDashedIcon,
	ACTIVE: ClockIcon,
	COMPLETED: CheckCircleIcon,
	ARCHIVED: ArchiveIcon,
};

export function ProjectStatusBadge({
	status,
	className,
}: {
	status: ProjectStatus;
	className?: string;
}) {
	const StatusIcon = projectStatusIcons[status];
	const label = getProjectStatusLabel(status);

	return (
		<Badge
			aria-label={`Project status: ${label}. ${getProjectStatusDescription(status)}`}
			className={className}
			variant={getProjectStatusVariant(status)}
		>
			<StatusIcon aria-hidden="true" />
			{label}
		</Badge>
	);
}
