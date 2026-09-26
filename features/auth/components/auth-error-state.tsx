"use client";

import { Button } from "@/components/ui/button";

export function AuthErrorState({
	title,
	description,
	onRetry,
}: {
	title: string;
	description: string;
	onRetry: () => void;
}) {
	return (
		<div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
			<h1 className="text-lg font-semibold">{title}</h1>
			<p className="mt-2 text-sm text-muted-foreground">{description}</p>
			<Button className="mt-4 min-h-11" type="button" onClick={onRetry}>
				Try again
			</Button>
		</div>
	);
}
