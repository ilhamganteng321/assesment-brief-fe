import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { InternalOnlyRoute } from "@/features/auth/route-guard";
import { TaskListSection } from "@/features/tasks/components/task-list-section";
import { TaskListSkeleton } from "@/features/tasks/components/task-list-skeleton";

export default function TasksPage() {
	return (
		<InternalOnlyRoute>
			<div className="flex flex-col gap-6">
				<PageHeader
					title="Tasks"
					description="Every task you have access to across all projects, scoped by your role."
				/>
				<Suspense fallback={<TaskListSkeleton />}>
					<TaskListSection />
				</Suspense>
			</div>
		</InternalOnlyRoute>
	);
}
