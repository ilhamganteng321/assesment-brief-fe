"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
/**
 * An accessible progress bar.
 *
 * The filled track is decorative; the value is carried by `aria-valuenow` and by
 * the adjacent text, so the reading never depends on colour alone. The number is
 * clamped here rather than trusted, because a percentage that came off the wire
 * must not be able to push the layout around.
 */
export function ProgressBar({
	percentage,
	label,
	pending = false,
}: {
	percentage: number;
	label: string;
	pending?: boolean;
}) {
	const value = Number.isFinite(percentage)
		? Math.min(100, Math.max(0, Math.round(percentage)))
		: 0;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between text-xs">
				<span className="text-muted-foreground">{label}</span>
				{pending ? (
					<Skeleton className="h-3 w-10" />
				) : (
					<span className="font-medium">{value}%</span>
				)}
			</div>
			{pending ? (
				<Skeleton className="h-2 w-full rounded-full" />
			) : (
				<div
					aria-label={`${label}: ${value}% complete`}
					aria-valuemax={100}
					aria-valuemin={0}
					aria-valuenow={value}
					className="h-2 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
				>
					<div
						className="h-full rounded-full bg-primary transition-[width]"
						style={{ width: `${String(value)}%` }}
					/>
				</div>
			)}
		</div>
	);
}

export type MetricTile = {
	label: string;
	value: number;
	/** Rendered under the number, e.g. "of 24 tasks". */
	hint?: string;
};

/**
 * A row of headline counts.
 *
 * `aria-busy` is set while loading so a screen reader announces the region as
 * updating rather than reading a wall of zeroes as if they were real.
 */
export function MetricTiles({
	title,
	tiles,
	pending,
}: {
	title: string;
	tiles: readonly MetricTile[];
	pending?: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent aria-busy={pending === true}>
				<dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					{tiles.map((tile) => (
						<div className="rounded-lg border p-3" key={tile.label}>
							<dt className="text-xs text-muted-foreground">{tile.label}</dt>
							<dd className="font-heading text-2xl font-semibold">
								{pending ? <Skeleton className="h-7 w-10" /> : tile.value}
							</dd>
							{tile.hint ? (
								<p className="text-xs text-muted-foreground">{tile.hint}</p>
							) : null}
						</div>
					))}
				</dl>
			</CardContent>
		</Card>
	);
}

export type DistributionRow = {
	label: string;
	value: number;
	/** Tailwind background class for the bar fill. */
	barClass: string;
};

/**
 * Task status distribution as labelled bars.
 *
 * Deliberately not a chart library: the numbers are printed next to every bar, so
 * the breakdown is readable without colour, and the bar is only a second cue.
 * A task can be both in-progress and blocked, so these rows are independent views
 * rather than slices of a single total and must not be summed.
 */
export function StatusDistribution({
	title,
	rows,
	total,
	pending,
}: {
	title: string;
	rows: readonly DistributionRow[];
	total: number;
	pending?: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent aria-busy={pending === true}>
				{pending ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-6 w-full" />
						<Skeleton className="h-6 w-full" />
						<Skeleton className="h-6 w-full" />
					</div>
				) : (
					<ul className="flex flex-col gap-3">
						{rows.map((row) => {
							const percent =
								total > 0 ? Math.round((row.value / total) * 100) : 0;

							return (
								<li className="flex flex-col gap-1" key={row.label}>
									<div className="flex items-center justify-between text-sm">
										<span>{row.label}</span>
										<span className="text-muted-foreground">
											{`${String(row.value)} (${String(percent)}%)`}
										</span>
									</div>
									<div
										aria-hidden="true"
										className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
									>
										<div
											className={`h-full rounded-full ${row.barClass}`}
											style={{ width: `${String(percent)}%` }}
										/>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
