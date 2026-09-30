"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { getRoleLabel } from "@/features/auth/role-labels";
import { USER_DEPARTMENTS, USER_ROLES } from "@/features/auth/types";
import { getDepartmentLabel } from "@/features/projects/labels";
import {
	DEFAULT_DEBOUNCE_MS,
	useDebouncedValue,
} from "@/lib/hooks/use-debounced-value";

import { getUserOrderKeyLabel } from "../labels";
import {
	DEFAULT_USER_ORDER_KEY,
	DEFAULT_USER_ORDER_RULE,
	USER_ORDER_KEYS,
	type UserListState,
} from "../list-state";

export const USER_ROWS_OPTIONS = [10, 20, 50, 100] as const;

const ORDER_RULE_OPTIONS = ["asc", "desc"] as const;

const SELECT_CLASS =
	"h-9 rounded-lg border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * The directory's search, filters and sort.
 *
 * Search is debounced and URL-backed, so it does not fire a request per
 * keystroke and so a half-typed term is never left in the address bar. The two
 * filters and the sort are plain selects that write straight to the URL, which
 * means they survive a refresh and can be shared as a link.
 *
 * The role and department labels are reused from the modules that already own
 * them — the point of those maps is that a role reads the same everywhere it
 * appears, and a second copy here is exactly how that stops being true.
 */
export function UserDirectoryToolbar({
	state,
	isFetching,
	onSearchChange,
	onRoleChange,
	onDepartmentChange,
	onOrderChange,
	onOrderRuleChange,
	onRowsChange,
}: {
	state: UserListState;
	isFetching: boolean;
	onSearchChange: (search: string) => void;
	onRoleChange: (role: UserListState["role"]) => void;
	onDepartmentChange: (department: UserListState["department"]) => void;
	onOrderChange: (orderKey: UserListState["orderKey"]) => void;
	onOrderRuleChange: (orderRule: UserListState["orderRule"]) => void;
	onRowsChange: (rows: number) => void;
}) {
	const [searchInput, setSearchInput] = useState(state.search);
	const [syncedSearch, setSyncedSearch] = useState(state.search);
	const debouncedSearch = useDebouncedValue(searchInput, DEFAULT_DEBOUNCE_MS);

	// The URL is the source of truth, so a value arriving from it — the back
	// button, a shared link, a cleared filter — has to overwrite what is in the
	// box, or the two drift and the box stops describing the list.
	if (state.search !== syncedSearch) {
		setSyncedSearch(state.search);
		setSearchInput(state.search);
	}

	useEffect(() => {
		if (debouncedSearch !== state.search) {
			onSearchChange(debouncedSearch);
		}
	}, [debouncedSearch, onSearchChange, state.search]);

	const sortValue = `${state.orderKey}:${state.orderRule}`;
	const sortLabel = `${getUserOrderKeyLabel(state.orderKey)}, ${
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
						aria-label="Search team members"
						className="pl-9"
						placeholder="Search by name or email"
						value={searchInput}
						onChange={(event) => setSearchInput(event.target.value)}
					/>
				</div>

				<select
					aria-label="Filter by role"
					className={SELECT_CLASS}
					value={state.role}
					onChange={(event) =>
						onRoleChange(event.target.value as UserListState["role"])
					}
				>
					<option value="all">All roles</option>
					{USER_ROLES.map((role) => (
						<option key={role} value={role}>
							{getRoleLabel(role)}
						</option>
					))}
				</select>

				<select
					aria-label="Filter by department"
					className={SELECT_CLASS}
					value={state.department}
					onChange={(event) =>
						onDepartmentChange(
							event.target.value as UserListState["department"],
						)
					}
				>
					<option value="all">All departments</option>
					{USER_DEPARTMENTS.map((department) => (
						<option key={department} value={department}>
							{getDepartmentLabel(department)}
						</option>
					))}
				</select>

				<select
					aria-label="Sort team members"
					className={SELECT_CLASS}
					value={sortValue}
					onChange={(event) => {
						const [key, rule] = event.target.value.split(":");
						if (!key || !rule) {
							onOrderChange(DEFAULT_USER_ORDER_KEY);
							onOrderRuleChange(DEFAULT_USER_ORDER_RULE);
							return;
						}
						onOrderChange(key as UserListState["orderKey"]);
						onOrderRuleChange(rule as UserListState["orderRule"]);
					}}
				>
					{USER_ORDER_KEYS.flatMap((key) =>
						ORDER_RULE_OPTIONS.map((rule) => (
							<option key={`${key}:${rule}`} value={`${key}:${rule}`}>
								{`${getUserOrderKeyLabel(key)}, ${rule === "asc" ? "ascending" : "descending"}`}
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
					{USER_ROWS_OPTIONS.map((rows) => (
						<option key={rows} value={rows}>
							{rows} rows
						</option>
					))}
				</select>
			</div>

			{/* Announced, so a background refetch is legible to a screen reader
			    rather than looking like the page did nothing. */}
			<span aria-live="polite" className="text-xs text-muted-foreground">
				{isFetching ? "Updating..." : sortLabel}
			</span>
		</div>
	);
}
