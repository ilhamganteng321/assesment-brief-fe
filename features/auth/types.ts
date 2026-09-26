export const USER_ROLES = ["PM", "INTERNAL", "CLIENT"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_DEPARTMENTS = [
	"PRODUCT",
	"UI_UX",
	"FRONTEND",
	"BACKEND",
	"CLIENT",
] as const;
export type UserDepartment = (typeof USER_DEPARTMENTS)[number];

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	department: UserDepartment;
};

export type AuthSession = {
	user: AuthUser;
	accessToken: string;
};

export type LoginRequest = {
	email: string;
	password: string;
};

export type RegisterRequest = {
	name: string;
	email: string;
	password: string;
	department?: UserDepartment;
};

export type CurrentUserResponse = {
	user: AuthUser;
};

export type LogoutResponse = {
	success: true;
	message: string;
};
