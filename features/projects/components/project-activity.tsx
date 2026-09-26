"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
	getAuditColumnLabel,
	getAuditValueLabel,
} from "@/features/tasks/labels";
import type { AuditedColumn } from "@/features/tasks/types";
import { formatDate } from "@/lib/format";

import type { ProjectActivityEntry } from "../types";

/**
 * The project's most recent changes, newest first.
 *
 * Every entry is read-only by construction: the audit log has no mutation route,
 * and this component offers no control that could rewrite one. The actor is shown
 * as an id rather than a name because resolving it to a person would mean
 * fetching the member list, and the id is enough to correlate with a change the
 * reader already has authorisation to investigate.
 */
export function ProjectActivity({
	entries,
	pending,
	error,
	onRetry,
}: {
	entries: readonly ProjectActivityEntry[];
	pending?: boolean;
	error?: unknown;
	onRetry?: () => void;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Recent activity</CardTitle>
			</CardHeader>
			<CardContent aria-busy={pending === true}>
				{pending ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : error !== undefined ? (
					<QueryErrorState
						error={error}
						title="Unable to load recent activity"
						onRetry={onRetry ?? (() => undefined)}
					/>
				) : entries.length === 0 ? (
					<EmptyState
						icon={<ClockCounterClockwiseIcon size={22} />}
						title="No recent activity"
						description="Changes to this project's tasks will appear here."
					/>
				) : (
					<ol className="flex flex-col divide-y">
						{entries.map((entry) => (
							<li className="flex flex-col gap-1 py-3" key={entry.id}>
								<p className="text-sm">
									<Link
										className="font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
										href={`/tasks/${entry.taskId}`}
									>
										{entry.taskTitle}
									</Link>
									{` — ${describeChange(entry)}`}
								</p>
								<time
									className="text-xs text-muted-foreground"
									dateTime={entry.createdAt}
								>
									{formatDate(entry.createdAt)}
								</time>
							</li>
						))}
					</ol>
				)}
			</CardContent>
		</Card>
	);
}

/** "Status changed from To do to In progress", in one clause. */
function describeChange(entry: ProjectActivityEntry): string {
	const column = entry.changedColumn as AuditedColumn;
	const field = getAuditColumnLabel(column);

	if (entry.oldValue === null && entry.newValue === null) {
		return `${field} updated`;
	}

	if (entry.oldValue === null) {
		return `${field} set to ${getAuditValueLabel(column, entry.newValue)}`;
	}

	if (entry.newValue === null) {
		return `${field} cleared (was ${getAuditValueLabel(column, entry.oldValue)})`;
	}

	return `${field} changed from ${getAuditValueLabel(column, entry.oldValue)} to ${getAuditValueLabel(column, entry.newValue)}`;
}
