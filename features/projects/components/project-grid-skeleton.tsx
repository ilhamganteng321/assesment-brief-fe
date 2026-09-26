import { Skeleton } from "@/components/ui/skeleton";

export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div
			aria-label="Loading projects"
			aria-busy="true"
			role="status"
			className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
		>
			{Array.from({ length: count }, (_, index) => (
				<div
					key={`project-skeleton-${index.toString()}`}
					className="flex flex-col gap-3 rounded-xl border bg-card p-4"
				>
					<Skeleton className="h-5 w-3/4" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="h-2 w-full" />
				</div>
			))}
			<span className="sr-only">Loading projects...</span>
		</div>
	);
}
