"use client";

import { Button } from "@/components/ui/button";
import type { Pagination } from "@/features/projects/types";

type DataPaginationProps = {
	pagination: Pagination;
	rows: number;
	rowsOptions: readonly number[];
	disabled?: boolean;
	onPageChange: (page: number) => void;
	onRowsChange: (rows: number) => void;
};

function getRowStart(pagination: Pagination): number {
	return (pagination.page - 1) * pagination.limit + 1;
}

function getRowEnd(pagination: Pagination): number {
	return Math.min(pagination.page * pagination.limit, pagination.total);
}

export function DataPagination({
	pagination,
	rows,
	rowsOptions,
	disabled = false,
	onPageChange,
	onRowsChange,
}: DataPaginationProps) {
	if (pagination.total === 0) {
		return null;
	}

	const totalPages = Math.max(1, pagination.totalPages);
	const canGoBack = pagination.page > 1;
	const canGoForward = pagination.page < totalPages;
	const start = getRowStart(pagination);
	const end = getRowEnd(pagination);
	const rowsId = "rows-per-page";

	return (
		<div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
			<div className="flex flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:gap-4">
				<p>
					Showing {start}-{end} of {pagination.total}
				</p>
				<div className="flex items-center gap-2">
					<label htmlFor={rowsId}>Rows</label>
					<select
						aria-label="Rows per page"
						className="h-8 rounded-lg border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						disabled={disabled}
						id={rowsId}
						value={rows}
						onChange={(event) => onRowsChange(Number(event.target.value))}
					>
						{rowsOptions.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Button
					disabled={disabled || !canGoBack}
					type="button"
					variant="outline"
					onClick={() => onPageChange(pagination.page - 1)}
				>
					Previous
				</Button>
				<span className="text-xs text-muted-foreground">
					Page {pagination.page} of {totalPages}
				</span>
				<Button
					disabled={disabled || !canGoForward}
					type="button"
					variant="outline"
					onClick={() => onPageChange(pagination.page + 1)}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
