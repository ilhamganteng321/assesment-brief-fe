"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TaskListSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			<Skeleton className="h-9 w-full" />
			{[0, 1, 2].map((index) => (
				<Card key={index}>
					<CardHeader>
						<Skeleton className="h-5 w-2/3" />
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-1/2" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}
