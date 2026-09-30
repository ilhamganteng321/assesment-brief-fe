"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ProjectAction = {
	label: string;
	onSelect: () => void;
	destructive?: boolean;
};

/**
 * A menu of the actions available on one project.
 *
 * A menu rather than a row of buttons because the set of available actions
 * depends on where the project is in its lifecycle: an active project can be
 * completed or deleted, a completed one can only be archived, and an archived one
 * has nowhere left to go and so offers no lifecycle entries at all. Listing them
 * all and disabling the impossible ones would imply a product that can reopen an
 * archived project, which it cannot.
 *
 * Delete is kept behind the menu rather than given a button of its own: it is the
 * least common of the actions and the one a misclick is least recoverable from,
 * so it does not belong at the same visual weight as completing a project.
 *
 * The trigger is a real button with an accessible name that says whose menu it
 * opens — a bare "…" in a grid of twenty projects is ambiguous out of context to
 * anyone navigating by voice or screen reader.
 */
export function ProjectActionMenu({
	actions,
	projectName,
}: {
	actions: readonly ProjectAction[];
	projectName: string;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label={`Actions for ${projectName}`}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<DotsThreeIcon aria-hidden="true" />
					</Button>
				}
			/>
			<DropdownMenuContent aria-label={`Actions for ${projectName}`}>
				{actions.map((action, index) => (
					<div key={action.label}>
						{index > 0 && action.destructive === true ? (
							<DropdownMenuSeparator />
						) : null}
						<DropdownMenuItem
							className={
								action.destructive === true ? "text-destructive" : undefined
							}
							onClick={action.onSelect}
						>
							{action.label}
						</DropdownMenuItem>
					</div>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
