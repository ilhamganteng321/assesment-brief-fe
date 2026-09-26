"use client";

import { WarningIcon } from "@phosphor-icons/react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type AppErrorProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div
			role="alert"
			className="mx-auto flex w-full max-w-lg flex-col items-start gap-3 rounded-xl border bg-card p-6"
		>
			<div className="flex items-center gap-2 text-destructive">
				<WarningIcon aria-hidden="true" size={20} weight="fill" />
				<h1 className="font-heading text-lg font-semibold">
					Something went wrong
				</h1>
			</div>
			<p className="text-sm text-muted-foreground">
				This page could not be displayed. The error has been logged. Try again,
				and if the problem continues, reload the page.
			</p>
			{error.digest ? (
				<p className="text-xs text-muted-foreground">
					Reference: {error.digest}
				</p>
			) : null}
			<Button className="min-h-11" type="button" onClick={reset}>
				Try again
			</Button>
		</div>
	);
}
