"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/provider";
import { formatDate } from "@/lib/format";

import { useTaskAuditLogs } from "../hooks";
import { getAuditColumnLabel, getAuditValueLabel } from "../labels";
import type { Task } from "../types";

type TaskActivityPanelProps = {
	task: Task;
};

/**
 * The task's append-only change history.
 *
 * Every entry is one column, so a request that changed three fields shows three
 * rows. There is no edit affordance anywhere in this component and the API
 * exposes no mutation route: history is a record of what happened, not state to
 * be corrected. Values are rendered from the server's stored strings, so this
 * view reflects the audit log rather than a second source of truth.
 */
export function TaskActivityPanel({ task }: TaskActivityPanelProps) {
	const { user } = useAuth();
	const role = user?.role;
	const query = useTaskAuditLogs(role, task.projectId, task.id);

	if (role === "CLIENT") {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Activity</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{query.isPending ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : query.isError ? (
					<QueryErrorState
						error={query.error}
						onRetry={() => void query.refetch()}
					/>
				) : query.data.auditLogs.length === 0 ? (
					<EmptyState
						icon={<ClockCounterClockwiseIcon size={22} />}
						title="No recorded changes"
						description="Updates to this task will appear here."
					/>
				) : (
					<>
						<p className="text-sm text-muted-foreground">
							{`${String(query.data.pagination.total)} recorded ${
								query.data.pagination.total === 1 ? "change" : "changes"
							}, newest first.`}
						</p>
						<ol className="flex flex-col gap-3">
							{query.data.auditLogs.map((entry) => (
								<li
									className="flex flex-col gap-1 border-l-2 border-border pl-3"
									key={entry.id}
								>
									<p className="text-sm font-medium">
										{getAuditColumnLabel(entry.changedColumn)}
									</p>
									<p className="text-sm text-muted-foreground">
										{entry.oldValue === null && entry.newValue === null ? (
											"No value"
										) : (
											<>
												<span className="line-through">
													{getAuditValueLabel(
														entry.changedColumn,
														entry.oldValue,
													)}
												</span>
												<span aria-hidden="true"> → </span>
												<span className="sr-only">changed to</span>
												{getAuditValueLabel(
													entry.changedColumn,
													entry.newValue,
												)}
											</>
										)}
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
					</>
				)}
			</CardContent>
		</Card>
	);
}
