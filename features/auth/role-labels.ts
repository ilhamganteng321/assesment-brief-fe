import type { UserRole } from "./types";

const roleLabels: Record<UserRole, string> = {
	PM: "Project Manager",
	INTERNAL: "Internal Team",
	CLIENT: "Client",
};

export function getRoleLabel(role: UserRole): string {
	return roleLabels[role];
}
