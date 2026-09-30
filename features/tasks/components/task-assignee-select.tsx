"use client";

import { Label } from "@/components/ui/label";
import { getRoleLabel } from "@/features/auth/role-labels";
import { getInitials } from "@/features/projects/member-display";
import { getTaskDepartmentLabel } from "../labels";
import type { TaskAssigneeSummary } from "../types";

/**
 * Chooses who is on a task.
 *
 * Extracted because the same decision is made in three places — the create/edit
 * form, the inline control on a board card, and the assignee filter above a task
 * list — and each of them had its own copy of the same list markup, its own empty
 * state, and its own way of spelling "nobody". One component means the option list
 * can never disagree with itself about who is eligible or what the blank choice is
 * called.
 *
 * Only project members are ever passed in. That is a *convenience*, not the
 * enforcement: the server re-checks membership, department and eligibility on every
 * write, and a caller that got this list wrong gets a 400 rather than an
 * assignment it did not intend.
 *
 * The blank option is always offered. An assigned task can be unassigned because
 * the update endpoint accepts an explicit `null`; an earlier version could not
 * express "take it off", so the option was hidden on edit and a task that had an
 * assignee was stuck with it. It is hidden only when the viewer may not change the
 * field, in which case the control is disabled and there is nothing to choose.
 */
export function TaskAssigneeSelect({
	id,
	label = "Assignee",
	value,
	options,
	disabled = false,
	invalid = false,
	emptyLabel = "Unassigned",
	errorMessage = null,
	onChange,
	register,
	/** The form field name, used when this control is registered. */
	name,
}: {
	id: string;
	label?: string;
	/** The chosen user id, or "" for nobody. */
	value: string;
	/** Project members, in the order they should be offered. */
	options: readonly TaskAssigneeSummary[];
	disabled?: boolean;
	invalid?: boolean;
	/** Wording for the "nobody" option. */
	emptyLabel?: string;
	errorMessage?: string | null;
	onChange?: (userId: string) => void;
	/**
	 * React Hook Form's register output, spread onto the `<select>` so the value is
	 * tracked by the form. Optional so the same control can be driven by an
	 * `onChange` callback where there is no form — the inline board editor.
	 */
	register?: Record<string, unknown>;
	/** The form field name; only meaningful alongside `register`. */
	name?: string;
}) {
	// Registered when this sits inside a form, driven directly when it does not.
	// One `<select>` either way, so the option list and the blank choice cannot
	// drift apart between the two call sites.
	const selectProps = register
		? { name, ...register }
		: {
				value,
				onChange: (event: { target: { value: string } }) =>
					onChange?.(event.target.value),
			};

	// The selected option is echoed above the control as a chip. The `<select>`
	// shows a name, not a person: on a form where the choice matters, the person
	// and their team should be readable without opening the dropdown, and the same
	// presentation then applies to the inline board control.
	const current = options.find((option) => option.id === value) ?? null;

	return (
		<div className="grid gap-2">
			<Label htmlFor={id}>{label}</Label>
			{current ? (
				<div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
					<span
						aria-hidden="true"
						className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold"
					>
						{getInitials(current.name)}
					</span>
					<span className="min-w-0 flex-1 truncate">
						{current.name}
						<span className="ml-2 text-xs text-muted-foreground">
							{getTaskDepartmentLabel(current.department)}
						</span>
					</span>
				</div>
			) : null}
			<select
				aria-invalid={invalid}
				className="h-9 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60"
				disabled={disabled}
				id={id}
				{...selectProps}
			>
				<option value="">{emptyLabel}</option>
				{options.map((option) => (
					<option key={option.id} value={option.id}>
						{`${option.name} (${getTaskDepartmentLabel(option.department)})`}
					</option>
				))}
			</select>
			{/* The count matters even when the list is not empty: a project with three
			    members cannot have a task assigned to anybody else, and saying so beats
			    letting a person wonder whether the list failed to load. */}
			{options.length === 0 && !disabled ? (
				<p className="text-xs text-muted-foreground">
					This project has no eligible assignees yet.
				</p>
			) : null}
			{errorMessage ? (
				<p className="text-sm text-destructive" role="alert">
					{errorMessage}
				</p>
			) : null}
		</div>
	);
}

/**
 * One line describing a person, for the places that only have room for text.
 *
 * Shown on a board card and a table row, where the avatar and the select would not
 * fit. The role is included on the card because it changes what the person will be
 * able to do with the task, and a card has room for it; the row keeps to the name.
 */
export function AssigneeSummaryLine({
	assignee,
	showRole = false,
}: {
	assignee: TaskAssigneeSummary | null;
	showRole?: boolean;
}) {
	if (!assignee) {
		return (
			<span className="text-xs text-muted-foreground">
				Unassigned
				<span className="sr-only">. This task has nobody on it.</span>
			</span>
		);
	}

	return (
		<span className="inline-flex min-w-0 items-center gap-1.5">
			<span
				aria-hidden="true"
				className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold"
			>
				{getInitials(assignee.name)}
			</span>
			<span className="truncate text-xs">{assignee.name}</span>
			{showRole ? (
				<span className="shrink-0 text-xs text-muted-foreground">
					{getRoleLabel(assignee.role)}
				</span>
			) : null}
		</span>
	);
}
