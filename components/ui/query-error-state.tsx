"use client";

import { WarningIcon } from "@phosphor-icons/react";

import { getApiErrorMessage } from "@/lib/api/error";

import { Button } from "./button";

type QueryErrorStateProps = {
	title?: string;
	description?: string;
	error: unknown;
	onRetry: () => void;
};

export function QueryErrorState({
	title = "Unable to load this data",
	description,
	error,
	onRetry,
}: QueryErrorStateProps) {
	return (
		<div
			role="alert"
			className="flex w-full flex-col items-start gap-3 rounded-xl border bg-card p-6 text-card-foreground"
		>
			<div className="flex items-center gap-2 text-destructive">
				<WarningIcon aria-hidden="true" size={20} weight="fill" />
				<h2 className="font-heading text-base font-semibold">{title}</h2>
			</div>
			<p className="text-sm text-muted-foreground">
				{description ?? getApiErrorMessage(error)}
			</p>
			<Button
				className="min-h-11"
				type="button"
				variant="outline"
				onClick={onRetry}
			>
				Try again
			</Button>
		</div>
	);
}
