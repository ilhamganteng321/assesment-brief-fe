"use client";

import { cn } from "cn";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { getRoleLabel } from "@/features/auth/role-labels";
import { getDepartmentLabel } from "@/features/projects/labels";
import { getInitials } from "@/features/projects/member-display";
import { formatDate } from "@/lib/format";

import type { DirectoryUser } from "../types";

/**
 * A colour-stable monogram.
 *
 * Derived from the user id rather than the name, so a person's tile does not
 * change colour when their name is edited, and two people with the same initials
 * do not look identical. The initials are the accessible content, so the colour
 * is a second cue and never the only one.
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
 * One person, as a table row.
 *
 * The name is the link to their profile; the row is not. A link stretched across
 * a whole table row is hard to hit precisely and worse to hit by keyboard, and it
 * would make the row's other cells unreachable.
 *
 * The email and the join date are hidden at narrow widths and repeated in
 * {@link UserCard} there instead — hidden rather than omitted so the table keeps
 * its column semantics for a screen reader at any width.
 */
export function UserRow({ user }: { user: DirectoryUser }) {
	return (
		<tr className="transition-colors hover:bg-muted/50">
			<TableCell>
				<Link
					className="flex min-h-11 items-center gap-3 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					href={`/team/${user.id}`}
				>
					<span
						aria-hidden="true"
						className={cn(
							"flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
							monogramTone(user.id),
						)}
					>
						{getInitials(user.name)}
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="truncate text-sm font-medium">{user.name}</span>
						<span className="truncate text-xs text-muted-foreground sm:hidden">
							{user.email}
						</span>
					</span>
					{/* The link is named for the person rather than announced as a bare
					    "profile", so a list of links is navigable out of context. */}
					<span className="sr-only">{`View ${user.name}'s profile`}</span>
				</Link>
			</TableCell>
			<TableCell className="hidden text-muted-foreground sm:table-cell">
				{user.email}
			</TableCell>
			<TableCell>
				<Badge variant="accent">{getRoleLabel(user.role)}</Badge>
			</TableCell>
			<TableCell>
				<Badge variant="outline">{getDepartmentLabel(user.department)}</Badge>
			</TableCell>
			<TableCell className="hidden text-muted-foreground lg:table-cell">
				{formatDate(user.createdAt)}
			</TableCell>
		</tr>
	);
}

/**
 * The same person as a stacked block, for narrow screens.
 *
 * One component and one fetch serve both layouts: the table is the semantic
 * structure and this is the visual fallback beneath it, hidden at `sm` and up.
 * A second data path for mobile would mean two queries that could disagree.
 */
export function UserCard({ user }: { user: DirectoryUser }) {
	return (
		<li className="flex flex-col gap-2 rounded-lg border p-4 sm:hidden">
			<div className="flex items-center gap-3">
				<span
					aria-hidden="true"
					className={cn(
						"flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
						monogramTone(user.id),
					)}
				>
					{getInitials(user.name)}
				</span>
				<div className="flex min-w-0 flex-1 flex-col">
					<Link
						className="truncate text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						href={`/team/${user.id}`}
					>
						{user.name}
					</Link>
					<span className="truncate text-xs text-muted-foreground">
						{user.email}
					</span>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-1.5">
				<Badge variant="accent">{getRoleLabel(user.role)}</Badge>
				<Badge variant="outline">{getDepartmentLabel(user.department)}</Badge>
				<span className="text-xs text-muted-foreground">
					{`Joined ${formatDate(user.createdAt)}`}
				</span>
			</div>
		</li>
	);
}
