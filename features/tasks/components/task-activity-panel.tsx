"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAttachmentList } from "@/features/attachments/hooks";
import { useAuth } from "@/features/auth/provider";
import { formatDate } from "@/lib/format";
import { useTaskAuditLogs } from "../hooks";
import { getAuditColumnLabel, getAuditValueLabel } from "../labels";
import {
	groupTimelineByDay,
	mergeTimeline,
	type TimelineEntry,
} from "../timeline";
import { AUDITED_COLUMNS, type AuditedColumn } from "../types";

const PAGE_SIZE = 10;

type TaskActivityPanelProps = {
	task: TaskLike;
};

/** Only the fields the panel reads, so the props stay narrow. */
type TaskLike = {
	id: string;
	projectId: string;
};

const COLUMN_FILTER_OPTIONS: ReadonlyArray<{
	value: AuditedColumn | "all";
	label: string;
}> = [
	{ value: "all", label: "All changes" },
	...AUDITED_COLUMNS.map((column) => ({
		value: column,
		label: getAuditColumnLabel(column),
	})),
];

/**
 * The task's change history.
 *
 * Read-only by construction: the audit log exposes no mutation route and this
 * component offers no control that could rewrite one, so the absence of an edit
 * affordance here is not a policy decision but a consequence of the API.
 *
 * A client guest gets nothing at all. The server refuses them the audit endpoint
 * before the project check, and the query is never issued, so there is no
 * internal actor, department, or field value for the browser to hold even
 * transiently.
 */
export function TaskActivityPanel({ task }: TaskActivityPanelProps) {
	const { user } = useAuth();
	const role = user?.role;
	const [page, setPage] = useState(1);
	const [column, setColumn] = useState<AuditedColumn | "all">("all");

	const auditQuery = useTaskAuditLogs(role, task.projectId, task.id, {
		page,
		limit: PAGE_SIZE,
		...(column === "all" ? {} : { changedColumn: column }),
	});
	// Uploads are read from the attachment list the panel already needs, so the
	// timeline can show them without a second source of truth. Soft-deleted
	// attachments are excluded by the server, so a removed file disappears from
	// the timeline too rather than lingering as a phantom event.
	const attachmentsQuery = useAttachmentList(
		role,
		task.projectId,
		task.id,
		1,
		50,
	);

	// Derived before the early return so hook order is identical on every render.
	// Both queries are already disabled for a client, so these simply resolve to
	// an empty timeline in that case.
	const timeline = useMemo(
		() =>
			mergeTimeline(
				auditQuery.data?.auditLogs ?? [],
				attachmentsQuery.data?.attachments ?? [],
			),
		[auditQuery.data?.auditLogs, attachmentsQuery.data?.attachments],
	);
	const groups = useMemo(() => groupTimelineByDay(timeline), [timeline]);

	if (role === "CLIENT") {
		return null;
	}

	const pagination = auditQuery.data?.pagination;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Activity</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center gap-2">
					<label
						className="text-xs text-muted-foreground"
						htmlFor="task-activity-column"
					>
						Changed field
					</label>
					<select
						className="h-8 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						id="task-activity-column"
						value={column}
						onChange={(event) => {
							// Changing the filter invalidates the current page: the
							// server has a different set of rows to page through.
							setPage(1);
							setColumn(event.target.value as AuditedColumn | "all");
						}}
					>
						{COLUMN_FILTER_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					{pagination !== undefined && pagination.total > 0 ? (
						<span className="text-xs text-muted-foreground">
							{`${String(pagination.total)} recorded ${
								pagination.total === 1 ? "change" : "changes"
							}`}
						</span>
					) : null}
				</div>

				{auditQuery.isPending ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : null}

				{auditQuery.isError ? (
					<QueryErrorState
						error={auditQuery.error}
						title="Unable to load activity"
						onRetry={() => void auditQuery.refetch()}
					/>
				) : null}

				{auditQuery.isSuccess && groups.length === 0 ? (
					<EmptyState
						icon={<ClockCounterClockwiseIcon size={22} />}
						title="No recorded changes"
						description={
							column === "all"
								? "Updates to this task will appear here."
								: `No changes to ${getAuditColumnLabel(
										column,
									).toLowerCase()} have been recorded.`
						}
					/>
				) : null}

				{groups.length > 0 ? (
					<div className="flex flex-col gap-5">
						{groups.map((group) => (
							<section className="flex flex-col gap-2" key={group.key}>
								<h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
									{group.label}
								</h3>
								<ol className="flex flex-col gap-3">
									{group.entries.map((entry) => (
										<TimelineRow entry={entry} key={entry.key} />
									))}
								</ol>
							</section>
						))}
					</div>
				) : null}

				{pagination !== undefined && pagination.totalPages > 1 ? (
					<nav
						aria-label="Activity pages"
						className="flex items-center justify-between gap-3 border-t pt-3"
					>
						<Button
							disabled={pagination.page <= 1}
							size="sm"
							type="button"
							variant="outline"
							onClick={() => setPage((current) => Math.max(1, current - 1))}
						>
							Previous
						</Button>
						<span className="text-xs text-muted-foreground">
							{`Page ${String(pagination.page)} of ${String(pagination.totalPages)}`}
						</span>
						<Button
							disabled={pagination.page >= pagination.totalPages}
							size="sm"
							type="button"
							variant="outline"
							onClick={() =>
								setPage((current) =>
									Math.min(pagination.totalPages, current + 1),
								)
							}
						>
							Next
						</Button>
					</nav>
				) : null}
			</CardContent>
		</Card>
	);
}

function TimelineRow({ entry }: { entry: TimelineEntry }) {
	if (entry.kind === "attachment-added") {
		return (
			<li className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
				<p className="text-sm font-medium">Attachment added</p>
				<p
					className="truncate text-sm text-muted-foreground"
					title={entry.subject}
				>
					{entry.subject}
				</p>
				<time
					className="text-xs text-muted-foreground"
					dateTime={entry.at}
					title={formatDate(entry.at)}
				>
					{formatTime(entry.at)}
				</time>
			</li>
		);
	}

	const column = entry.subject as AuditedColumn;
	const label = getAuditColumnLabel(column);
	const hasBoth = entry.oldValue !== null && entry.newValue !== null;
	const hasNeither = entry.oldValue === null && entry.newValue === null;

	return (
		<li className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
			<p className="text-sm font-medium">
				{hasNeither ? `${label} updated` : `${label} changed`}
			</p>
			{hasBoth ? (
				<p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
					<span className="line-through">
						{getAuditValueLabel(column, entry.oldValue)}
					</span>
					<span aria-hidden="true">→</span>
					<span className="sr-only">changed to</span>
					<span className="font-medium text-foreground">
						{getAuditValueLabel(column, entry.newValue)}
					</span>
				</p>
			) : entry.newValue !== null ? (
				<p className="text-sm text-muted-foreground">
					{`Set to ${getAuditValueLabel(column, entry.newValue)}`}
				</p>
			) : entry.oldValue !== null ? (
				<p className="text-sm text-muted-foreground">
					{`Cleared (was ${getAuditValueLabel(column, entry.oldValue)})`}
				</p>
			) : null}
			<time
				className="text-xs text-muted-foreground"
				dateTime={entry.at}
				title={formatDate(entry.at)}
			>
				{formatTime(entry.at)}
			</time>
		</li>
	);
}

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
	hour: "2-digit",
	minute: "2-digit",
});

function formatTime(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "Unknown" : timeFormatter.format(date);
}
