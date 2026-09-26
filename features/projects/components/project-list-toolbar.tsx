"use client";

import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DEFAULT_DEBOUNCE_MS,
	useDebouncedValue,
} from "@/lib/hooks/use-debounced-value";
import { getProjectStatusLabel } from "../labels";
import {
	DEFAULT_PROJECT_ORDER_KEY,
	DEFAULT_PROJECT_ORDER_RULE,
	PROJECT_ORDER_KEYS,
	type ProjectListState,
} from "../list-state";
import { PROJECT_STATUSES } from "../types";

export const PROJECT_ROWS_OPTIONS = [10, 20, 50, 100] as const;

const ORDER_RULE_OPTIONS = ["asc", "desc"] as const;

type ProjectListToolbarProps = {
	state: ProjectListState;
	isFetching: boolean;
	canCreate: boolean;
	onSearchChange: (search: string) => void;
	onStatusChange: (status: ProjectListState["status"]) => void;
	onOrderChange: (orderKey: ProjectListState["orderKey"]) => void;
	onOrderRuleChange: (orderRule: ProjectListState["orderRule"]) => void;
	onRowsChange: (rows: number) => void;
	onCreateClick: () => void;
};

export function getOrderKeyLabel(key: ProjectListState["orderKey"]): string {
	switch (key) {
		case "name":
			return "Name";
		case "status":
			return "Status";
		default:
			return "Created";
	}
}

export function ProjectListToolbar({
	state,
	isFetching,
	canCreate,
	onSearchChange,
	onStatusChange,
	onOrderChange,
	onOrderRuleChange,
	onRowsChange,
	onCreateClick,
}: ProjectListToolbarProps) {
	const [searchInput, setSearchInput] = useState(state.search);
	const [syncedSearch, setSyncedSearch] = useState(state.search);
	const debouncedSearch = useDebouncedValue(searchInput, DEFAULT_DEBOUNCE_MS);

	if (state.search !== syncedSearch) {
		setSyncedSearch(state.search);
		setSearchInput(state.search);
	}

	useEffect(() => {
		if (debouncedSearch !== state.search) {
			onSearchChange(debouncedSearch);
		}
	}, [debouncedSearch, onSearchChange, state.search]);

	const isDefaultOrder =
		state.orderKey === DEFAULT_PROJECT_ORDER_KEY &&
		state.orderRule === DEFAULT_PROJECT_ORDER_RULE;
	const sortValue = isDefaultOrder
		? "default"
		: `${state.orderKey}:${state.orderRule}`;
	const statusLabel = isDefaultOrder
		? "Newest first"
		: `${getOrderKeyLabel(state.orderKey)}, ${
				state.orderRule === "asc" ? "ascending" : "descending"
			}`;

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1 sm:max-w-xs">
					<MagnifyingGlassIcon
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						aria-label="Search projects"
						className="pl-9"
						placeholder="Search by name"
						value={searchInput}
						onChange={(event) => setSearchInput(event.target.value)}
					/>
				</div>
				<select
					aria-label="Filter by status"
					className="h-9 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					value={state.status}
					onChange={(event) =>
						onStatusChange(event.target.value as ProjectListState["status"])
					}
				>
					<option value="all">All statuses</option>
					{PROJECT_STATUSES.map((status) => (
						<option key={status} value={status}>
							{getProjectStatusLabel(status)}
						</option>
					))}
				</select>
				<select
					aria-label="Sort projects"
					className="h-9 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					value={sortValue}
					onChange={(event) => {
						const [key, rule] = event.target.value.split(":");

						if (key === "default" || !rule) {
							onOrderChange(DEFAULT_PROJECT_ORDER_KEY);
							onOrderRuleChange(DEFAULT_PROJECT_ORDER_RULE);
							return;
						}

						onOrderChange(key as ProjectListState["orderKey"]);
						onOrderRuleChange(rule as ProjectListState["orderRule"]);
					}}
				>
					<option value="default">Newest first</option>
					{PROJECT_ORDER_KEYS.flatMap((key) =>
						ORDER_RULE_OPTIONS.map((rule) => (
							<option key={`${key}:${rule}`} value={`${key}:${rule}`}>
								{`${getOrderKeyLabel(key)}, ${rule === "asc" ? "ascending" : "descending"}`}
							</option>
						)),
					)}
				</select>
				<select
					aria-label="Rows per page"
					className="h-9 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					value={state.rows}
					onChange={(event) => onRowsChange(Number(event.target.value))}
				>
					{PROJECT_ROWS_OPTIONS.map((rows) => (
						<option key={rows} value={rows}>
							{rows} rows
						</option>
					))}
				</select>
			</div>
			<div className="flex items-center gap-3">
				<span aria-live="polite" className="text-xs text-muted-foreground">
					{isFetching ? "Updating..." : statusLabel}
				</span>
				{canCreate ? (
					<Button className="min-h-9" type="button" onClick={onCreateClick}>
						<PlusIcon aria-hidden="true" />
						New project
					</Button>
				) : null}
			</div>
		</div>
	);
}
