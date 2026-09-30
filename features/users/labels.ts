import type { UserOrderKey } from "./list-state";

/**
 * Human labels for the directory's own vocabulary.
 *
 * A separate module from the toolbar so it can be exercised without pulling in
 * React. The role and department labels are *not* restated here: they already
 * live in the auth and project label maps, and a second copy is exactly how a
 * role starts reading differently in two places. This module owns only what the
 * directory itself introduces.
 */

/**
 * The name a person would use for a sort column.
 *
 * `createdAt` is shown as "Joined" because that is what the column means to
 * somebody looking at a list of colleagues — "Created" reads like a record was
 * created rather than a person.
 */
const userOrderKeyLabels: Readonly<Record<UserOrderKey, string>> = {
	name: "Name",
	email: "Email",
	role: "Role",
	department: "Department",
	createdAt: "Joined",
};

export function getUserOrderKeyLabel(key: UserOrderKey): string {
	return userOrderKeyLabels[key];
}
