"use client";

import { CheckIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogRoot,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/provider";
import { getRoleLabel } from "@/features/auth/role-labels";
import { InvitationCreateDialog } from "@/features/invitations/components/invitation-create-dialog";
import { getApiErrorMessage } from "@/lib/api/error";
import {
	DEFAULT_DEBOUNCE_MS,
	useDebouncedValue,
} from "@/lib/hooks/use-debounced-value";

import { useAddProjectMember, useProjectMemberCandidates } from "../hooks";
import { getDepartmentLabel } from "../labels";
import { getInitials } from "../member-display";
import {
	isSearchableCandidateQuery,
	MIN_MEMBER_CANDIDATE_SEARCH,
} from "../member-search";
import { canSearchProjectMemberCandidates } from "../permissions";
import type { Project, ProjectMemberCandidate } from "../types";

/**
 * Finds a colleague and puts them on the project.
 *
 * The search is server-side and debounced, because the candidate set is every
 * account in the organisation and cannot be filtered in the browser. Below two
 * characters nothing is requested at all — the server would answer with an empty
 * page, and asking on every keystroke of a field the user has just cleared would
 * be pure noise.
 *
 * People who are already on the project are listed but not selectable, and say
 * so. That is a courtesy rather than the rule: the add endpoint refuses a
 * duplicate on its own, and it will also refuse if the answer this dialog is
 * holding has gone stale in the meantime. Which is why the selection is only
 * offered for a row the server marked as addable, and why the error is shown in
 * place with the dialog still open rather than swallowed.
 *
 * When the search finds nobody, the address that was typed is offered as an
 * invitation instead. That is the moment somebody discovers the person they want is
 * not a user, so it is the right place to say "they do not have an account yet —
 * send them a link". It is a separate dialog rather than a button on the row,
 * because adding somebody who already exists and inviting somebody who does not are
 * different acts with different consequences, and conflating them would make the
 * confirmation mean two things.
 */
export function ProjectAddMemberDialog({
	project,
	open,
	onOpenChange,
	onAdded,
}: {
	project: Project;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called with the member the server created, so a list can be refetched. */
	onAdded?: (userId: string) => void;
}) {
	const { user } = useAuth();
	const role = user?.role;
	const searchId = useId();
	const [search, setSearch] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [inviteOpen, setInviteOpen] = useState(false);
	const debouncedSearch = useDebouncedValue(search, DEFAULT_DEBOUNCE_MS);
	const isSearchable = isSearchableCandidateQuery(debouncedSearch);
	const candidatesQuery = useProjectMemberCandidates(
		role,
		project.id,
		debouncedSearch,
	);
	const addMember = useAddProjectMember(role);
	const maySearch = canSearchProjectMemberCandidates({ role });

	const candidates = candidatesQuery.data?.candidates ?? [];
	// The selection is *derived* from the results rather than reset by an effect.
	// A selected id only counts while its row is still on screen, so once the
	// search moves on the selection resolves to null and the submit button
	// disables itself — no cascading render, and no way to submit an id the user
	// can no longer see they picked.
	const selected =
		candidates.find((candidate) => candidate.id === selectedId) ?? null;
	const errorMessage = addMember.error
		? getApiErrorMessage(addMember.error)
		: null;

	function handleOpenChange(nextOpen: boolean) {
		if (addMember.isPending) {
			return;
		}
		if (!nextOpen) {
			setSearch("");
			setSelectedId(null);
			setInviteOpen(false);
			addMember.reset();
		}
		onOpenChange(nextOpen);
	}

	async function handleSubmit() {
		if (selected === null) {
			return;
		}

		try {
			await addMember.mutateAsync({
				projectId: project.id,
				userId: selected.id,
			});
			onAdded?.(selected.id);
			handleOpenChange(false);
		} catch {
			// Rendered below, with the dialog still open so the search is intact and
			// the person can pick somebody else.
			return;
		}
	}

	return (
		<DialogRoot onOpenChange={handleOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add member</DialogTitle>
					<DialogDescription>
						Search for someone already in the workspace to add them to this
						project. Membership is what gives them access to it.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-2">
					<Label htmlFor={searchId}>Search users</Label>
					<div className="relative">
						<MagnifyingGlassIcon
							aria-hidden="true"
							className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							autoComplete="off"
							autoFocus
							className="pl-9"
							id={searchId}
							placeholder="Search by name or email"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>
					{search.trim().length > 0 &&
					search.trim().length < MIN_MEMBER_CANDIDATE_SEARCH ? (
						<p className="text-xs text-muted-foreground">
							{`Type at least ${String(MIN_MEMBER_CANDIDATE_SEARCH)} characters to search.`}
						</p>
					) : null}
				</div>

				<CandidateResults
					canSearch={maySearch}
					email={search.trim()}
					error={candidatesQuery.isError ? candidatesQuery.error : undefined}
					isSearchable={isSearchable}
					pending={candidatesQuery.isFetching && isSearchable}
					results={candidates}
					selectedId={selectedId}
					onInvite={() => setInviteOpen(true)}
					onRetry={() => void candidatesQuery.refetch()}
					onSelect={setSelectedId}
				/>

				{errorMessage ? (
					<p className="text-sm text-destructive" role="alert">
						{errorMessage}
					</p>
				) : null}

				<DialogFooter>
					<Button
						disabled={addMember.isPending}
						render={<DialogClose />}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={addMember.isPending || selected === null}
						type="button"
						onClick={() => void handleSubmit()}
					>
						{addMember.isPending ? "Adding..." : "Add member"}
					</Button>
				</DialogFooter>

				{/* Rendered inside the add dialog's root so the two share one modal
				    layer, but it is a separate dialog with its own confirmation: adding
				    somebody who exists and inviting somebody who does not are different
				    acts, and one confirm button meaning both would be worse than two
				    buttons. */}
				{inviteOpen ? (
					<InvitationCreateDialog
						onInvited={() => setInviteOpen(false)}
						onOpenChange={setInviteOpen}
						open
						prefillEmail={search.trim()}
						project={project}
					/>
				) : null}
			</DialogContent>
		</DialogRoot>
	);
}

function CandidateResults({
	canSearch,
	results,
	pending,
	isSearchable,
	error,
	selectedId,
	email,
	onSelect,
	onInvite,
	onRetry,
}: {
	canSearch: boolean;
	results: readonly ProjectMemberCandidate[];
	pending: boolean;
	isSearchable: boolean;
	error?: unknown;
	selectedId: string | null;
	email: string;
	onSelect: (userId: string) => void;
	onInvite: () => void;
	onRetry: () => void;
}) {
	if (!canSearch) {
		return (
			<p className="text-sm text-muted-foreground">
				You do not have permission to add members to this project.
			</p>
		);
	}

	// `aria-live` on the results region: a search that resolves to nothing is
	// otherwise silent, and "no results" is the most common thing a person waits
	// to be told here.
	return (
		<div
			aria-busy={pending === true}
			aria-live="polite"
			className="max-h-64 overflow-y-auto rounded-lg border"
		>
			{pending ? (
				<div className="flex flex-col gap-2 p-3">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : error !== undefined ? (
				<div className="p-3">
					<p className="text-sm text-destructive" role="alert">
						{getApiErrorMessage(error)}
					</p>
					<Button
						className="mt-2"
						size="sm"
						type="button"
						variant="outline"
						onClick={onRetry}
					>
						Try again
					</Button>
				</div>
			) : !isSearchable ? (
				<p className="p-4 text-sm text-muted-foreground">
					Search for someone by name or email to add them.
				</p>
			) : results.length === 0 ? (
				<NoResults email={email} onInvite={onInvite} />
			) : (
				<ul className="flex flex-col divide-y">
					{results.map((candidate) => {
						const isSelected = candidate.id === selectedId;
						return (
							<li key={candidate.id}>
								<button
									aria-pressed={isSelected}
									className={cn(
										"flex w-full min-h-11 items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
										isSelected ? "bg-muted" : "hover:bg-muted/50",
									)}
									disabled={candidate.alreadyMember}
									type="button"
									onClick={() => onSelect(candidate.id)}
								>
									<span
										aria-hidden="true"
										className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
									>
										{getInitials(candidate.name)}
									</span>
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="truncate text-sm font-medium">
											{candidate.name}
										</span>
										<span className="truncate text-xs text-muted-foreground">
											{candidate.email}
										</span>
									</span>
									<span className="shrink-0 text-xs text-muted-foreground">
										{candidate.alreadyMember
											? "Already a member"
											: getDepartmentLabel(candidate.department)}
									</span>
									{isSelected ? (
										<CheckIcon aria-hidden="true" weight="bold" />
									) : null}
									{/* Announced rather than shown as a colour alone, so the
									    selection is not colour-only information. */}
									<span className="sr-only">
										{isSelected
											? "Selected"
											: candidate.alreadyMember
												? "Already a member, cannot be added"
												: `Role: ${getRoleLabel(candidate.role)}`}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

/**
 * Nobody matched, so the next move is an invitation rather than a dead end.
 *
 * Only offered for something that could be an address. A one-character search that
 * happened to match nothing is not evidence that anybody is missing — the server
 * would not even have scanned — and offering to email it would be a way to send
 * nonsense to a stranger.
 *
 * The wording says what an invitation *is* rather than implying the person is being
 * added, because the two are easy to confuse and the difference matters: somebody
 * who has not accepted is not on the project, and the list of members will not
 * change.
 */
function NoResults({
	email,
	onInvite,
}: {
	email: string;
	onInvite: () => void;
}) {
	const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

	if (!looksLikeEmail) {
		return (
			<p className="p-4 text-sm text-muted-foreground">
				No users found. Check the spelling, or invite this address if they do
				not have an account yet.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-3 p-4">
			<p className="text-sm text-muted-foreground">
				{`No user matches ${email}.`}
			</p>
			<Button
				className="self-start"
				size="sm"
				type="button"
				variant="outline"
				onClick={onInvite}
			>
				Invite by email instead
			</Button>
		</div>
	);
}
