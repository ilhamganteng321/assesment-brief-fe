"use client";

import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogRoot,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/provider";
import type { Project } from "@/features/projects/types";
import { getApiErrorMessage } from "@/lib/api/error";

import { useCreateProjectInvitation } from "../hooks";

/**
 * Invites an address that is not in the directory yet.
 *
 * Reached from the add-member dialog when a search comes back empty, which is the
 * moment somebody discovers the person they want is not a user. Reached from the
 * invitations section as well, so a manager can send an invitation without first
 * having to prove the person does not exist.
 *
 * Two things are deliberately absent. There is no "copy the link" affordance,
 * because the token is never sent to the browser and the only copy is in the
 * recipient's inbox. And there is no role picker, because role is global on the
 * account and an invitation does not create one — a recipient registers and is
 * given the role the product gives new accounts, which the manager can change
 * afterwards if it needs to be different.
 *
 * The address is normalized the same way the server does before it is sent, so the
 * field cannot disagree with what will be compared against the recipient's
 * account at acceptance time. Doing it here rather than only on the server is what
 * makes the stored value match, because an address typed in capitals would
 * otherwise be compared against a lowercase account and lock the recipient out of
 * their own invitation.
 */
export function InvitationCreateDialog({
	project,
	open,
	onOpenChange,
	onInvited,
	prefillEmail = "",
}: {
	project: Pick<Project, "id" | "name" | "status">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onInvited?: (email: string) => void;
	/** The address the person already typed, carried over from a search. */
	prefillEmail?: string;
}) {
	const { user } = useAuth();
	const createInvitation = useCreateProjectInvitation(user?.role);
	const [email, setEmail] = useState(prefillEmail);
	const [touched, setTouched] = useState(false);

	const normalized = normalizeEmail(email);
	const validationError = validateEmail(normalized);
	const canSubmit = validationError === null && !createInvitation.isPending;
	const errorMessage = createInvitation.error
		? getApiErrorMessage(createInvitation.error)
		: null;

	function handleOpenChange(nextOpen: boolean) {
		if (createInvitation.isPending) {
			return;
		}
		if (!nextOpen) {
			setEmail("");
			setTouched(false);
			createInvitation.reset();
		}
		onOpenChange(nextOpen);
	}

	async function handleSubmit() {
		setTouched(true);
		if (!canSubmit) {
			return;
		}

		try {
			await createInvitation.mutateAsync({
				projectId: project.id,
				payload: { email: normalized },
			});
			onInvited?.(normalized);
			handleOpenChange(false);
		} catch {
			// Shown below with the dialog still open, so a refused duplicate or a
			// failed delivery does not cost the person the address they typed.
			return;
		}
	}

	return (
		<DialogRoot onOpenChange={handleOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite by email</DialogTitle>
					<DialogDescription>
						{`Send a link that lets somebody join ${project.name}. They will be able to accept it only by signing in as this address, and only once.`}
					</DialogDescription>
				</DialogHeader>

				<form
					className="grid gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						void handleSubmit();
					}}
				>
					<Label htmlFor="invitation-email">Email address</Label>
					<Input
						autoComplete="off"
						autoFocus
						id="invitation-email"
						inputMode="email"
						placeholder="name@example.com"
						type="email"
						value={email}
						onBlur={() => setTouched(true)}
						onChange={(event) => setEmail(event.target.value)}
					/>
					{touched && validationError ? (
						<p className="text-xs text-destructive">{validationError}</p>
					) : (
						<p className="text-xs text-muted-foreground">
							The link expires in 7 days and can only be used by this address.
						</p>
					)}
					{errorMessage ? (
						<p className="text-sm text-destructive" role="alert">
							{errorMessage}
						</p>
					) : null}
					{/* A submit button as well as the footer one, so the form works
					    with Enter and the dialog has a real submit target. Hidden from
					    the layout rather than omitted, because an input inside a form
					    with no submit button silently does nothing on Enter. */}
					<button className="sr-only" type="submit">
						Send invitation
					</button>
				</form>

				<DialogFooter>
					<Button
						disabled={createInvitation.isPending}
						type="button"
						variant="outline"
						onClick={() => handleOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						disabled={!canSubmit}
						type="button"
						onClick={() => void handleSubmit()}
					>
						<EnvelopeSimpleIcon aria-hidden="true" />
						{createInvitation.isPending ? "Sending..." : "Send invitation"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</DialogRoot>
	);
}

/**
 * Trimmed and lowercased, the way the server stores it.
 *
 * Not cosmetic. Acceptance compares the signed-in account's address against the
 * stored one as a string equality, so `Ada@Example.com` and `ada@example.com` have
 * to be the same value at write time or the recipient is locked out of an
 * invitation sent to themselves.
 */
export function normalizeEmail(value: string): string {
	return value.trim().toLowerCase();
}

/**
 * The same shape the server accepts, for the same reason: showing a valid-looking
 * address, failing on submit, and saying "invalid email" afterwards is a worse
 * experience than saying it while the field is being filled in. The server still
 * validates — this only avoids the round trip.
 */
export function validateEmail(value: string): string | null {
	if (value.length === 0) {
		return "Enter an email address.";
	}
	if (value.length > 255) {
		return "Email must be at most 255 characters.";
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
		return "Enter a valid email address.";
	}
	return null;
}
