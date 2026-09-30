"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { getRoleLabel } from "@/features/auth/role-labels";
import { getDepartmentLabel } from "../labels";
import { getInitials } from "../member-display";
import type { ProjectMember } from "../types";

/**
 * A colour-stable monogram.
 *
 * Derived from the user's id rather than their name, so a person's tile does not
 * change colour when their name is edited, and two people with the same initials
 * do not look identical. The initials themselves are the accessible content, so
 * the colour is a second cue rather than the only one.
 */
function monogramTone(userId: string): string {
	let hash = 0;
	for (let index = 0; index < userId.length; index += 1) {
		hash = (hash * 31 + userId.charCodeAt(index)) % 997;
	}

	const tones = [
		"bg-primary/15 text-primary dark:bg-primary/25",
		"bg-secondary text-secondary-foreground",
		"bg-muted text-foreground",
		"bg-accent text-accent-foreground",
	];

	return tones[hash % tones.length] ?? tones[0];
}

/**
 * One person on a project.
 *
 * Shows the four things a reader needs to know about somebody: who they are,
 * how to reach them, what they are allowed to do here, and which team they are
 * on. The role is the important one — it is the only record of a member's
 * authority, because this product has no per-project role.
 *
 * One layout at every breakpoint, not a table that becomes cards on small
 * screens: the content is a handful of short fields, and a stacked flex row
 * reflows correctly on its own. The remove control is the last child, so on a
 * narrow screen it lands under the name rather than squeezing the email into an
 * ellipsis.
 */
export function ProjectMemberRow({
	member,
	canRemove,
	isRemoving,
	onRemove,
}: {
	member: ProjectMember;
	/** Mirrors `canManageProjectMembers`, gated further by the project status. */
	canRemove: boolean;
	/** True while this particular row's removal is in flight. */
	isRemoving?: boolean;
	onRemove: () => void;
}) {
	const { user } = member;

	return (
		<li className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
			<span
				aria-hidden="true"
				className={cn(
					"flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
					monogramTone(user.id),
				)}
			>
				{getInitials(user.name)}
			</span>

			<div className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-sm font-medium">{user.name}</span>
				<span className="truncate text-xs text-muted-foreground">
					{user.email}
				</span>
			</div>

			<div className="flex shrink-0 items-center gap-1.5">
				<Badge variant="accent">{getRoleLabel(user.role)}</Badge>
				<Badge variant="outline">{getDepartmentLabel(user.department)}</Badge>
			</div>

			{canRemove ? (
				<Button
					aria-label={`Remove ${user.name} from this project`}
					className="shrink-0"
					disabled={isRemoving}
					size="icon-sm"
					type="button"
					variant="ghost"
					onClick={onRemove}
				>
					<TrashIcon aria-hidden="true" />
				</Button>
			) : null}
		</li>
	);
}
