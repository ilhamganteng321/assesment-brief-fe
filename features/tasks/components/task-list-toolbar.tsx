"use client";

import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DEFAULT_DEBOUNCE_MS,
	useDebouncedValue,
} from "@/lib/hooks/use-debounced-value";
import {
	getTaskDepartmentLabel,
	getTaskPriorityLabel,
	getTaskStatusLabel,
} from "../labels";
import {
	DEFAULT_TASK_ORDER_KEY,
	DEFAULT_TASK_ORDER_RULE,
	TASK_ORDER_KEYS,
	type TaskListState,
} from "../list-state";
import { TASK_DEPARTMENTS, TASK_PRIORITIES, TASK_STATUSES } from "../types";

export const TASK_ROWS_OPTIONS = [10, 20, 50, 100] as const;

const ORDER_RULE_OPTIONS = ["asc", "desc"] as const;

const VIEW_OPTIONS: ReadonlyArray<{
	value: TaskListState["view"];
	label: string;
}> = [
	{ value: "list", label: "List" },
	{ value: "board", label: "Board" },
];

const SELECT_CLASS =
	"h-9 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type TaskListToolbarProps = {
	state: TaskListState;
	isFetching: boolean;
	canCreate: boolean;
	onSearchChange: (search: string) => void;
	onStatusChange: (status: TaskListState["status"]) => void;
	onPriorityChange: (priority: TaskListState["priority"]) => void;
	onDepartmentChange: (department: TaskListState["department"]) => void;
	onOrderChange: (orderKey: TaskListState["orderKey"]) => void;
	onOrderRuleChange: (orderRule: TaskListState["orderRule"]) => void;
	onRowsChange: (rows: number) => void;
	onViewChange: (view: TaskListState["view"]) => void;
	onCreateClick: () => void;
};

export function getTaskOrderKeyLabel(key: TaskListState["orderKey"]): string {
	switch (key) {
		case "title":
			return "Title";
		case "status":
			return "Status";
		case "priority":
			return "Priority";
		case "updatedAt":
			return "Updated";
		default:
			return "Created";
	}
}

export function TaskListToolbar({
	state,
	isFetching,
	canCreate,
	onSearchChange,
	onStatusChange,
	onPriorityChange,
	onDepartmentChange,
	onOrderChange,
	onOrderRuleChange,
	onRowsChange,
	onViewChange,
	onCreateClick,
}: TaskListToolbarProps) {
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
		state.orderKey === DEFAULT_TASK_ORDER_KEY &&
		state.orderRule === DEFAULT_TASK_ORDER_RULE;
	const sortValue = isDefaultOrder
		? "default"
		: `${state.orderKey}:${state.orderRule}`;
	const sortLabel = isDefaultOrder
		? "Newest first"
		: `${getTaskOrderKeyLabel(state.orderKey)}, ${
				state.orderRule === "asc" ? "ascending" : "descending"
			}`;

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
				<div className="relative flex-1 sm:max-w-xs">
					<MagnifyingGlassIcon
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						aria-label="Search tasks"
						className="pl-9"
						placeholder="Search by title"
						value={searchInput}
						onChange={(event) => setSearchInput(event.target.value)}
					/>
				</div>
				<select
					aria-label="Filter tasks by status"
					className={SELECT_CLASS}
					value={state.status}
					onChange={(event) =>
						onStatusChange(event.target.value as TaskListState["status"])
					}
				>
					<option value="all">All statuses</option>
					{TASK_STATUSES.map((status) => (
						<option key={status} value={status}>
							{getTaskStatusLabel(status)}
						</option>
					))}
				</select>
				<select
					aria-label="Filter tasks by priority"
					className={SELECT_CLASS}
					value={state.priority}
					onChange={(event) =>
						onPriorityChange(event.target.value as TaskListState["priority"])
					}
				>
					<option value="all">All priorities</option>
					{TASK_PRIORITIES.map((priority) => (
						<option key={priority} value={priority}>
							{getTaskPriorityLabel(priority)}
						</option>
					))}
				</select>
				<select
					aria-label="Filter tasks by department"
					className={SELECT_CLASS}
					value={state.department}
					onChange={(event) =>
						onDepartmentChange(
							event.target.value as TaskListState["department"],
						)
					}
				>
					<option value="all">All departments</option>
					{TASK_DEPARTMENTS.map((department) => (
						<option key={department} value={department}>
							{getTaskDepartmentLabel(department)}
						</option>
					))}
				</select>
				<select
					aria-label="Sort tasks"
					className={SELECT_CLASS}
					value={sortValue}
					onChange={(event) => {
						const [key, rule] = event.target.value.split(":");

						if (key === "default" || !rule) {
							onOrderChange(DEFAULT_TASK_ORDER_KEY);
							onOrderRuleChange(DEFAULT_TASK_ORDER_RULE);
							return;
						}

						onOrderChange(key as TaskListState["orderKey"]);
						onOrderRuleChange(rule as TaskListState["orderRule"]);
					}}
				>
					<option value="default">Newest first</option>
					{TASK_ORDER_KEYS.flatMap((key) =>
						ORDER_RULE_OPTIONS.map((rule) => (
							<option key={`${key}:${rule}`} value={`${key}:${rule}`}>
								{`${getTaskOrderKeyLabel(key)}, ${rule === "asc" ? "ascending" : "descending"}`}
							</option>
						)),
					)}
				</select>
				<select
					aria-label="Rows per page"
					className={SELECT_CLASS}
					value={state.rows}
					onChange={(event) => onRowsChange(Number(event.target.value))}
				>
					{TASK_ROWS_OPTIONS.map((rows) => (
						<option key={rows} value={rows}>
							{rows} rows
						</option>
					))}
				</select>
			</div>
			<div className="flex items-center gap-3">
				<fieldset
					aria-label="Task view"
					className="flex rounded-lg border p-0.5"
				>
					<legend className="sr-only">Task view</legend>
					{VIEW_OPTIONS.map((option) => (
						<button
							key={option.value}
							aria-pressed={state.view === option.value}
							className={`min-h-8 rounded-md px-3 text-sm transition-colors ${
								state.view === option.value
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
							type="button"
							onClick={() => onViewChange(option.value)}
						>
							{option.label}
						</button>
					))}
				</fieldset>
				<span aria-live="polite" className="text-xs text-muted-foreground">
					{isFetching ? "Updating..." : sortLabel}
				</span>
				{canCreate ? (
					<Button className="min-h-9" type="button" onClick={onCreateClick}>
						<PlusIcon aria-hidden="true" />
						New task
					</Button>
				) : null}
			</div>
		</div>
	);
}
