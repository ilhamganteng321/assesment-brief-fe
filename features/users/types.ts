import type { UserDepartment, UserRole } from "@/features/auth/types";

/** Re-exported so the directory and the auth types cannot drift apart. */
export type { UserDepartment, UserRole };

/**
 * A person as the directory returns them.
 *
 * Exactly the six fields the server sends, and the server names those six columns
 * on its query — `passwordHash` is never read from the database at all. There is
 * no per-project role: a member's authority is their global `role`, which is
 * why the directory shows it.
 */
export type DirectoryUser = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	department: UserDepartment;
	createdAt: string;
};

export type UserPagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type UserList = {
	users: DirectoryUser[];
	pagination: UserPagination;
};

export type UserDetail = {
	user: DirectoryUser;
};
