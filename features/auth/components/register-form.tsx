"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api/error";

import { register } from "../api";
import { useAuth } from "../provider";
import { getAuthPageHref, getPostAuthPath } from "../redirects";
import { type RegisterRequestValues, registerRequestSchema } from "../schemas";
import { zodResolver } from "../zod-resolver";

type RegisterFormProps = {
	redirectTo?: string;
};

export function RegisterForm({ redirectTo }: RegisterFormProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { startSession } = useAuth();
	const [formError, setFormError] = useState<string | null>(null);
	const destination = getPostAuthPath(redirectTo);
	const sessionExpired = searchParams.get("reason") === "session-expired";
	const {
		register: registerField,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<RegisterRequestValues>({
		resolver: zodResolver(registerRequestSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			department: undefined,
		},
		mode: "onBlur",
	});

	const onSubmit = handleSubmit(async (values) => {
		setFormError(null);

		try {
			const session = await register({
				...values,
				department: values.department || undefined,
			});
			startSession(session);
			router.replace(destination);
		} catch (error) {
			setFormError(getApiErrorMessage(error));
		}
	});

	return (
		<form className="space-y-5" noValidate onSubmit={onSubmit}>
			<div className="grid gap-6">
				<div className="grid gap-2">
					<Label htmlFor="name">
						Full name <span aria-hidden="true">*</span>
					</Label>
					<Input
						id="name"
						autoComplete="name"
						placeholder="Your name"
						required
						{...registerField("name")}
					/>
					{errors.name ? (
						<p className="text-sm text-destructive" role="alert">
							{errors.name.message}
						</p>
					) : null}
				</div>

				<div className="grid gap-2">
					<Label htmlFor="email">
						Email <span aria-hidden="true">*</span>
					</Label>
					<Input
						id="email"
						type="email"
						autoComplete="email"
						inputMode="email"
						placeholder="you@company.com"
						required
						{...registerField("email")}
					/>
					{errors.email ? (
						<p className="text-sm text-destructive" role="alert">
							{errors.email.message}
						</p>
					) : null}
				</div>

				<div className="grid gap-2">
					<Label htmlFor="password">
						Password <span aria-hidden="true">*</span>
					</Label>
					<Input
						id="password"
						type="password"
						autoComplete="new-password"
						minLength={8}
						required
						{...registerField("password")}
					/>
					{errors.password ? (
						<p className="text-sm text-destructive" role="alert">
							{errors.password.message}
						</p>
					) : (
						<p className="text-sm text-muted-foreground">
							Use at least 8 characters with upper and lowercase letters,
							numbers, and a symbol.
						</p>
					)}
				</div>

				<div className="grid gap-2">
					<Label htmlFor="department">Department</Label>
					<select
						id="department"
						className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
						defaultValue=""
						{...registerField("department", {
							setValueAs: (value: unknown) =>
								typeof value === "string" && value ? value : undefined,
						})}
					>
						<option value="">Select a department (optional)</option>
						<option value="PRODUCT">Product</option>
						<option value="UI_UX">UI/UX</option>
						<option value="FRONTEND">Frontend</option>
						<option value="BACKEND">Backend</option>
						<option value="CLIENT">Client</option>
					</select>
					{errors.department ? (
						<p className="text-sm text-destructive" role="alert">
							{errors.department.message}
						</p>
					) : null}
				</div>
			</div>

			{sessionExpired ? (
				<p className="text-sm text-muted-foreground" role="status">
					Your session expired. Please sign in again.
				</p>
			) : null}

			<AuthFormError message={formError} />

			<Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
				{isSubmitting ? "Creating account..." : "Create account"}
			</Button>

			<p className="text-center text-sm text-muted-foreground">
				Already have an account?{" "}
				<Link
					className="inline-flex min-h-11 items-center font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					href={getAuthPageHref("login", destination)}
				>
					Sign in
				</Link>
			</p>
		</form>
	);
}

function AuthFormError({ message }: { message: string | null }) {
	return (
		<p
			className="min-h-5 text-sm text-destructive"
			role="alert"
			aria-live="polite"
			aria-atomic="true"
		>
			{message}
		</p>
	);
}
