import { CheckCircleIcon, CircleIcon, FolderIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ClientProject } from "../types";

function clampPercentage(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.min(100, Math.max(0, Math.round(value)));
}

export function ClientProjectCard({ project }: { project: ClientProject }) {
	const percentage = clampPercentage(project.progress.percentage);
	const { completed, inProgress, todo, blocked, total } = project.tasks;

	return (
		<Card
			size="sm"
			className="relative transition-colors hover:border-primary/40"
		>
			<CardHeader>
				<CardTitle>
					<Link
						className="rounded-sm after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						href={`/projects/${project.id}`}
					>
						{project.name}
					</Link>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground">Progress</span>
						<span className="font-medium">{percentage}%</span>
					</div>
					<div
						aria-label={`${percentage}% complete`}
						role="progressbar"
						aria-valuemax={100}
						aria-valuemin={0}
						aria-valuenow={percentage}
						className="h-2 w-full overflow-hidden rounded-full bg-muted"
					>
						<div
							className="h-full rounded-full bg-primary transition-[width]"
							style={{ width: `${percentage}%` }}
						/>
					</div>
				</div>
				<dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
					<div className="flex items-center gap-1.5">
						<CheckCircleIcon aria-hidden="true" />
						<dt className="sr-only">Completed</dt>
						<dd>
							{completed} of {total} completed
						</dd>
					</div>
					<div className="flex items-center gap-1.5">
						<FolderIcon aria-hidden="true" />
						<dt className="sr-only">In progress</dt>
						<dd>{inProgress} in progress</dd>
					</div>
					<div className="flex items-center gap-1.5">
						<CircleIcon aria-hidden="true" />
						<dt className="sr-only">To do</dt>
						<dd>{todo} to do</dd>
					</div>
					<div className="flex items-center gap-1.5">
						<span
							aria-hidden="true"
							className="size-2 rounded-full bg-destructive"
						/>
						<dt className="sr-only">Blocked</dt>
						<dd>{blocked} blocked</dd>
					</div>
				</dl>
			</CardContent>
		</Card>
	);
}
