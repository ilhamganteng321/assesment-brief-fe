"use client";

import { UsersIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { DataPagination } from "@/components/ui/data-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCaption,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/provider";

import { useUsers } from "../hooks";
import {
	hasUserCriteria,
	parseUserListState,
	serializeUserListState,
	toUserListQueryParams,
	type UserListState,
	withUserPage,
	withUserPageReset,
} from "../list-state";
import { canBrowseUserDirectory } from "../permissions";
import {
	USER_ROWS_OPTIONS,
	UserDirectoryToolbar,
} from "./user-directory-toolbar";
import { UserCard, UserRow } from "./user-row";

/**
 * The team directory.
 *
 * Browsing and finding people — nothing here changes a user. The directory exists
 * so a project manager can discover somebody before putting them on a project;
 * the actual membership change happens on the project, through the project-scoped
 * candidate search, because that is where the authorization lives.
 *
 * Every visible control is driven by the URL, so a filtered view can be shared,
 * bookmarked, survived by a refresh, and undone with the back button. The page
 * reads that state and writes it back, rather than holding a copy in component
 * state that the address bar and the list could drift apart on.
 */
export function UserDirectorySection() {
	const { user } = useAuth();
	const role = user?.role;
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const state = parseUserListState(
		new URLSearchParams(searchParams.toString()),
	);
	const queryParams = useMemo(() => toUserListQueryParams(state), [state]);
	const usersQuery = useUsers(role, queryParams);
	const mayBrowse = canBrowseUserDirectory({ role });

	const applyState = useCallback(
		(nextState: UserListState) => {
			const query = serializeUserListState(nextState).toString();
			// `replace` rather than `push`: typing a search is not a navigation a
			// person wants to step back through keystroke by keystroke.
			router.replace(query.length > 0 ? `${pathname}?${query}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router],
	);

	if (!mayBrowse) {
		// Unreachable through the navigation, which only offers Team to a project
		// manager. Kept so a hand-typed URL reads as a refusal rather than a page
		// that silently shows nothing.
		return (
			<QueryErrorState
				description="The team directory is available to project managers. Ask your project manager to add you to a project instead."
				error={new Error("USER_DIRECTORY_ACCESS_DENIED")}
				title="You do not have access to the team directory"
				onRetry={() => router.push("/projects")}
			/>
		);
	}

	if (usersQuery.isPending) {
		return (
			<div
				aria-busy="true"
				aria-label="Loading team directory"
				className="flex flex-col gap-4"
				role="status"
			>
				<PageHeader
					title="Team"
					description="Find the people you work with and put them on a project."
				/>
				<Skeleton className="h-9 w-full" />
				<div className="flex flex-col gap-2">
					{Array.from({ length: 6 }, (_, index) => (
						<Skeleton className="h-12 w-full" key={`row-${String(index)}`} />
					))}
				</div>
				<span className="sr-only">Loading team members...</span>
			</div>
		);
	}

	if (usersQuery.isError) {
		return (
			<div className="flex flex-col gap-4">
				<PageHeader title="Team" />
				<QueryErrorState
					error={usersQuery.error}
					title="Unable to load the team directory"
					onRetry={() => void usersQuery.refetch()}
				/>
			</div>
		);
	}

	const { users, pagination } = usersQuery.data;
	const isFiltered = hasUserCriteria(state);
	const isRefetching = usersQuery.isFetching;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Team"
				description="Find the people you work with and put them on a project."
			/>

			<UserDirectoryToolbar
				isFetching={isRefetching}
				state={state}
				onDepartmentChange={(department) =>
					applyState(withUserPageReset(state, { department }))
				}
				onOrderChange={(orderKey) =>
					applyState(withUserPageReset(state, { orderKey }))
				}
				onOrderRuleChange={(orderRule) =>
					applyState(withUserPageReset(state, { orderRule }))
				}
				onRoleChange={(roleFilter) =>
					applyState(withUserPageReset(state, { role: roleFilter }))
				}
				onRowsChange={(rows) => applyState(withUserPageReset(state, { rows }))}
				onSearchChange={(search) =>
					applyState(withUserPageReset(state, { search }))
				}
			/>

			{users.length === 0 ? (
				<EmptyState
					action={
						isFiltered ? (
							<button
								className="text-sm font-medium text-primary underline-offset-4 hover:underline"
								type="button"
								onClick={() =>
									applyState(
										withUserPageReset(state, {
											search: "",
											role: "all",
											department: "all",
										}),
									)
								}
							>
								Clear filters
							</button>
						) : undefined
					}
					icon={<UsersIcon size={22} />}
					title={isFiltered ? "No team members found" : "Nobody here yet"}
					description={
						isFiltered
							? "Try changing your search or filters."
							: "Accounts will appear here as they are created."
					}
				/>
			) : (
				<>
					{/* Dimmed rather than replaced while a background refetch runs, so
					    paging does not flash an empty list between clicks. */}
					<div
						className={
							isRefetching
								? "opacity-60 transition-opacity"
								: "transition-opacity"
						}
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead className="hidden sm:table-cell">Email</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Department</TableHead>
									<TableHead className="hidden lg:table-cell">Joined</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{users.map((person) => (
									<UserRow key={person.id} user={person} />
								))}
							</TableBody>
							<TableCaption className="text-xs">
								{`Showing ${String(users.length)} of ${String(pagination.total)}`}
							</TableCaption>
						</Table>

						{/* The same people, stacked, for narrow screens. Same data, same
						    components, no second request. */}
						<ul className="flex flex-col gap-3 sm:hidden">
							{users.map((person) => (
								<UserCard key={person.id} user={person} />
							))}
						</ul>
					</div>

					<DataPagination
						disabled={isRefetching}
						pagination={pagination}
						rows={state.rows}
						rowsOptions={USER_ROWS_OPTIONS}
						onPageChange={(page) => applyState(withUserPage(state, page))}
						onRowsChange={(rows) =>
							applyState(withUserPageReset(state, { rows }))
						}
					/>
				</>
			)}
		</div>
	);
}
