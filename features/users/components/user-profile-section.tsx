"use client";

import {
	ArrowLeftIcon,
	BuildingsIcon,
	EnvelopeSimpleIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { PageBreadcrumbs, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useAuth } from "@/features/auth/provider";
import { getRoleLabel } from "@/features/auth/role-labels";
import { getDepartmentLabel } from "@/features/projects/labels";
import { getInitials } from "@/features/projects/member-display";
import { normalizeApiError } from "@/lib/api/error";
import { formatDate } from "@/lib/format";

import { useUser } from "../hooks";
import { canBrowseUserDirectory } from "../permissions";

/**
 * One person's profile.
 *
 * Shows the six fields the server returns and nothing else. In particular it does
 * not show project membership, their tasks, or anything they have done: a
 * directory entry is not a way to see a person's work, and the projects a person
 * belongs to are governed by the project visibility rules rather than by anything
 * reachable from a profile. The server sends no such data here, so the component
 * has no field to render by accident.
 *
 * Kept separate from `/settings`, which is the signed-in user's own account. This
 * page is for looking somebody else up.
 */
export function UserProfileSection({ userId }: { userId: string }) {
	const { user } = useAuth();
	const role = user?.role;
	const router = useRouter();
	const userQuery = useUser(role, userId);
	const person = userQuery.data;
	const mayBrowse = canBrowseUserDirectory({ role });

	if (!mayBrowse) {
		return (
			<QueryErrorState
				description="The team directory is available to project managers."
				error={new Error("USER_DIRECTORY_ACCESS_DENIED")}
				title="You do not have access to this profile"
				onRetry={() => router.push("/projects")}
			/>
		);
	}

	if (userQuery.isPending) {
		return (
			<div
				aria-busy="true"
				aria-label="Loading profile"
				className="flex flex-col gap-6"
				role="status"
			>
				<div className="flex flex-col gap-2">
					<div className="h-4 w-32 rounded-md bg-muted" />
					<div className="h-8 w-56 rounded-md bg-muted" />
				</div>
				<div className="rounded-xl border bg-card p-6">
					<div className="h-16 w-16 rounded-full bg-muted" />
				</div>
				<span className="sr-only">Loading profile...</span>
			</div>
		);
	}

	if (userQuery.isError) {
		const code = normalizeApiError(userQuery.error).code;

		return (
			<QueryErrorState
				description={
					code === "USER_NOT_FOUND"
						? "Nobody here matches that link."
						: undefined
				}
				error={userQuery.error}
				title={
					code === "USER_NOT_FOUND"
						? "User not found"
						: "Unable to load this profile"
				}
				onRetry={() => void userQuery.refetch()}
			/>
		);
	}

	if (!person) {
		return (
			<EmptyState
				title="User not found"
				description="Nobody here matches that link."
			/>
		);
	}

	const isSelf = person.id === user?.id;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title={person.name}>
				<PageBreadcrumbs
					items={[{ label: "Team", href: "/team" }, { label: person.name }]}
				/>
			</PageHeader>

			<Card>
				<CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
					<span
						aria-hidden="true"
						className={cn(
							"flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold",
							"bg-primary/15 text-primary dark:bg-primary/25",
						)}
					>
						{getInitials(person.name)}
					</span>
					<div className="flex min-w-0 flex-col gap-1">
						<span className="text-lg font-semibold">{person.name}</span>
						<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
							<EnvelopeSimpleIcon aria-hidden="true" />
							{person.email}
						</span>
					</div>
					{isSelf ? (
						<Badge className="ml-auto" variant="secondary">
							You
						</Badge>
					) : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="inline-flex items-center gap-2">
						<BuildingsIcon aria-hidden="true" />
						Details
					</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
						<div className="flex flex-col gap-1">
							<dt className="text-xs text-muted-foreground">Role</dt>
							<dd>
								<Badge variant="accent">{getRoleLabel(person.role)}</Badge>
							</dd>
						</div>
						<div className="flex flex-col gap-1">
							<dt className="text-xs text-muted-foreground">Department</dt>
							<dd>
								<Badge variant="outline">
									{getDepartmentLabel(person.department)}
								</Badge>
							</dd>
						</div>
						<div className="flex flex-col gap-1">
							<dt className="text-xs text-muted-foreground">Joined</dt>
							<dd>
								<time dateTime={person.createdAt}>
									{formatDate(person.createdAt)}
								</time>
							</dd>
						</div>
					</dl>

					<p className="mt-4 text-sm text-muted-foreground">
						Role and department are the account-wide values. This product has no
						per-project role, so a person&apos;s authority is the same
						everywhere — what changes from project to project is which projects
						they are a member of.
					</p>
				</CardContent>
			</Card>

			{/* `ButtonLink` rather than a `Button` wrapping a `Link`: this navigates,
			    so it must stay an anchor that can be opened in a new tab. */}
			<ButtonLink href="/team" variant="outline">
				<ArrowLeftIcon aria-hidden="true" />
				Back to team
			</ButtonLink>
		</div>
	);
}
