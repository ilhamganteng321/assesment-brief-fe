import { ProjectGridSkeleton } from "@/features/projects/components/project-grid-skeleton";

export default function AppLoading() {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<div className="h-4 w-32 animate-pulse rounded-md bg-muted" />
				<div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
				<div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
			</div>
			<ProjectGridSkeleton />
		</div>
	);
}
