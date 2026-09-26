import Link from "next/link";
import type { ReactNode } from "react";

type PageHeaderProps = {
	title: string;
	description?: string;
	actions?: ReactNode;
	children?: ReactNode;
};

export function PageHeader({
	title,
	description,
	actions,
	children,
}: PageHeaderProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-1">
					{children}
					<h1 className="font-heading text-2xl font-semibold tracking-tight">
						{title}
					</h1>
					{description ? (
						<p className="max-w-2xl text-sm text-muted-foreground">
							{description}
						</p>
					) : null}
				</div>
				{actions ? (
					<div className="flex shrink-0 items-center gap-2">{actions}</div>
				) : null}
			</div>
		</div>
	);
}

type PageBreadcrumbsProps = {
	items: readonly { label: string; href?: string }[];
};

export function PageBreadcrumbs({ items }: PageBreadcrumbsProps) {
	return (
		<nav aria-label="Breadcrumb">
			<ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
				{items.map((item, position) => (
					<li key={item.href ?? item.label} className="flex items-center gap-1">
						{position > 0 ? <span aria-hidden="true">/</span> : null}
						{item.href ? (
							<Link
								className="rounded-sm hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								href={item.href}
							>
								{item.label}
							</Link>
						) : (
							<span aria-current="page" className="text-foreground">
								{item.label}
							</span>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
