import { Skeleton } from "@/components/ui/skeleton";

export function ProjectDetailSkeleton() {
	return (
		<div
			aria-busy="true"
			aria-label="Loading project"
			role="status"
			className="flex flex-col gap-6"
		>
			<div className="flex flex-col gap-2">
				<Skeleton className="h-4 w-40" />
				<Skeleton className="h-8 w-2/3" />
				<Skeleton className="h-4 w-1/2" />
			</div>
			<div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
			</div>
			<span className="sr-only">Loading project...</span>
		</div>
	);
}

export function ProjectTaskListSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div
			aria-busy="true"
			aria-label="Loading tasks"
			role="status"
			className="flex flex-col gap-3"
		>
			{Array.from({ length: rows }, (_, index) => (
				<div
					key={`task-skeleton-${index.toString()}`}
					className="flex flex-col gap-2 rounded-lg border bg-card p-4"
				>
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="h-3 w-full" />
				</div>
			))}
			<span className="sr-only">Loading tasks...</span>
		</div>
	);
}
