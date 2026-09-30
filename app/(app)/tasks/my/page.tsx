import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { InternalOnlyRoute } from "@/features/auth/route-guard";
import { TaskListSection } from "@/features/tasks/components/task-list-section";
import { TaskListSkeleton } from "@/features/tasks/components/task-list-skeleton";

/**
 * Your own work, across every project you are a member of.
 *
 * Its own URL rather than a tab on the global task list, because it answers a
 * different question and is worth bookmarking as the page somebody opens every
 * morning. Reuses `TaskListSection` in `mine` scope, so the filters, the URL
 * state, the cards and the pagination are the same ones the global list uses —
 * there is no second task-management surface to drift.
 *
 * The assignee is decided by the server from the access token, so this page has no
 * user id anywhere in it and no way to become somebody else's view by editing the
 * URL.
 */
export default function MyTasksPage() {
	return (
		<InternalOnlyRoute>
			<div className="flex flex-col gap-6">
				<PageHeader
					title="My Tasks"
					description="Everything assigned to you across all your projects."
				/>
				<Suspense fallback={<TaskListSkeleton />}>
					<TaskListSection scope="mine" />
				</Suspense>
			</div>
		</InternalOnlyRoute>
	);
}
