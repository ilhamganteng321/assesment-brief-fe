"use client";

import {
	MagnifyingGlassIcon,
	UserPlusIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/provider";

import { useProjectMembers } from "../hooks";
import { filterProjectMembers } from "../member-search";
import { canManageProjectMembersNow } from "../permissions";
import type { Project, ProjectMember } from "../types";
import { ProjectAddMemberDialog } from "./project-add-member-dialog";
import { ProjectMemberRow } from "./project-member-row";
import { ProjectRemoveMemberDialog } from "./project-remove-member-dialog";

/**
 * Who is on this project, and — for a project manager — who can be put on it.
 *
 * The member list is a roster rather than a search result, so it is filtered in
 * the browser from the rows already loaded: a project's membership is a small
 * bounded set, and a server round trip per keystroke would add requests and
 * latency to buy nothing. The one search that *is* server-side is the candidate
 * picker inside the add dialog, because its input is the whole organisation.
 *
 * The count is read off the loaded list rather than fetched separately, for the
 * same reason: the list is already here, so a second request for its length would
 * be asking the same question twice.
 */
export function ProjectMembersSection({
	project,
	id,
	className,
}: {
	project: Project;
	/** Anchor target, so the project tab strip can jump to this section. */
	id?: string;
	className?: string;
}) {
	const { user } = useAuth();
	const role = user?.role;
	const membersQuery = useProjectMembers(role, project.id);
	const [search, setSearch] = useState("");
	const [addOpen, setAddOpen] = useState(false);
	const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);

	// Derived from the query result directly rather than via `?? []`, which would
	// be a new array identity on every render and defeat the memo below.
	const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
	const visible = useMemo(
		() => filterProjectMembers(members, search),
		[members, search],
	);
	const canManage = canManageProjectMembersNow({ role }, project);
	const removingId = removeTarget?.userId;

	return (
		<Card className={className} id={id}>
			<CardHeader>
				<CardTitle className="inline-flex items-center gap-2">
					<UsersIcon aria-hidden="true" />
					Project members
					{membersQuery.isPending ? null : (
						<span className="text-sm font-normal text-muted-foreground">
							{members.length === 1
								? "1 member"
								: `${String(members.length)} members`}
						</span>
					)}
				</CardTitle>
			</CardHeader>

			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="relative sm:max-w-xs sm:flex-1">
						<MagnifyingGlassIcon
							aria-hidden="true"
							className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							aria-label="Filter project members"
							className="pl-9"
							placeholder="Filter members"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>
					{canManage ? (
						<Button
							className="min-h-9 shrink-0"
							type="button"
							onClick={() => setAddOpen(true)}
						>
							<UserPlusIcon aria-hidden="true" />
							Add member
						</Button>
					) : null}
				</div>

				<MemberList
					error={membersQuery.isError ? membersQuery.error : undefined}
					isLoading={membersQuery.isPending}
					members={visible}
					canRemove={canManage}
					removingId={removingId}
					totalCount={members.length}
					hasSearch={search.trim().length > 0}
					onRetry={() => void membersQuery.refetch()}
					onRemove={setRemoveTarget}
				/>
			</CardContent>

			{addOpen ? (
				<ProjectAddMemberDialog
					onOpenChange={setAddOpen}
					open
					project={project}
				/>
			) : null}

			{removeTarget ? (
				<ProjectRemoveMemberDialog
					member={removeTarget}
					onOpenChange={(nextOpen) => {
						if (!nextOpen) {
							setRemoveTarget(null);
						}
					}}
					open
				/>
			) : null}
		</Card>
	);
}

function MemberList({
	members,
	totalCount,
	isLoading,
	error,
	hasSearch,
	canRemove,
	removingId,
	onRemove,
	onRetry,
}: {
	members: readonly ProjectMember[];
	totalCount: number;
	isLoading: boolean;
	error?: unknown;
	hasSearch: boolean;
	canRemove: boolean;
	removingId?: string;
	onRemove: (member: ProjectMember) => void;
	onRetry: () => void;
}) {
	if (isLoading) {
		return (
			<div
				aria-busy="true"
				aria-label="Loading project members"
				className="flex flex-col gap-3"
				role="status"
			>
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<span className="sr-only">Loading project members...</span>
			</div>
		);
	}

	if (error !== undefined) {
		return (
			<QueryErrorState
				error={error}
				title="Unable to load project members"
				onRetry={onRetry}
			/>
		);
	}

	if (totalCount === 0) {
		return (
			<EmptyState
				className="border-0 bg-transparent px-0 py-6"
				icon={<UsersIcon size={20} />}
				title="No members yet"
				description={
					canRemove
						? "Add somebody to give them access to this project and its tasks."
						: "Nobody has been added to this project yet."
				}
			/>
		);
	}

	if (members.length === 0) {
		return (
			<EmptyState
				className="border-0 bg-transparent px-0 py-6"
				icon={<MagnifyingGlassIcon size={20} />}
				title="No members match"
				description={`None of the ${String(totalCount)} members on this project match that filter.`}
			/>
		);
	}

	return (
		<>
			{/* Announced, because filtering a list of people down to nothing is
			    otherwise indistinguishable from the list having failed to load. */}
			<p aria-live="polite" className="text-xs text-muted-foreground">
				{hasSearch && members.length < totalCount
					? `Showing ${String(members.length)} of ${String(totalCount)} members.`
					: null}
			</p>
			<ul className="flex flex-col divide-y">
				{members.map((member) => (
					<ProjectMemberRow
						canRemove={canRemove}
						isRemoving={removingId === member.userId}
						key={member.id}
						member={member}
						onRemove={() => onRemove(member)}
					/>
				))}
			</ul>
		</>
	);
}
