import { cn } from "cn";
import type { ReactNode } from "react";

type EmptyStateProps = {
	title: string;
	description: string;
	icon?: ReactNode;
	action?: ReactNode;
	className?: string;
};

export function EmptyState({
	title,
	description,
	icon,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-12 text-center",
				className,
			)}
		>
			{icon ? (
				<span
					aria-hidden="true"
					className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
				>
					{icon}
				</span>
			) : null}
			<div className="flex flex-col gap-1">
				<h2 className="font-heading text-base font-semibold">{title}</h2>
				<p className="max-w-md text-sm text-muted-foreground">{description}</p>
			</div>
			{action}
		</div>
	);
}
