import { z } from "zod";

import { USER_DEPARTMENTS } from "./types";

const emailSchema = z
	.string()
	.trim()
	.toLowerCase()
	.email("Enter a valid email address.")
	.max(255, "Email must be at most 255 characters.");

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, "Password is required.").max(72),
});

export const registerRequestSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required.")
		.max(100, "Name must be at most 100 characters."),
	email: emailSchema,
	password: z
		.string()
		.min(8, "Password must be at least 8 characters.")
		.max(72, "Password must be at most 72 characters."),
	department: z.enum(USER_DEPARTMENTS).optional(),
});

export const registerFormSchema = registerRequestSchema
	.extend({
		confirmPassword: z.string().min(1, "Confirm your password."),
	})
	.refine((values) => values.password === values.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterRequestValues = z.infer<typeof registerRequestSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
