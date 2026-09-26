import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ProjectGridSkeleton } from "@/features/projects/components/project-grid-skeleton";
import { ProjectListSection } from "@/features/projects/components/project-list-section";

export default function ProjectsPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Projects"
				description="Every project you have access to, scoped by your role."
			/>
			<Suspense fallback={<ProjectGridSkeleton />}>
				<ProjectListSection />
			</Suspense>
		</div>
	);
}
