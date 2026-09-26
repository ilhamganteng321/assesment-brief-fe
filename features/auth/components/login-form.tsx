"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api/error";

import { login } from "../api";
import { useAuth } from "../provider";
import { getAuthPageHref, getPostAuthPath } from "../redirects";
import { type LoginFormValues, loginSchema } from "../schemas";
import { zodResolver } from "../zod-resolver";

type LoginFormProps = {
	redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { startSession } = useAuth();
	const [formError, setFormError] = useState<string | null>(null);
	const destination = getPostAuthPath(redirectTo);
	const sessionExpired = searchParams.get("reason") === "session-expired";
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
		mode: "onBlur",
	});

	const onSubmit = handleSubmit(async (values) => {
		setFormError(null);

		try {
			const session = await login(values);
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
						{...register("email")}
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
						autoComplete="current-password"
						required
						{...register("password")}
					/>
					{errors.password ? (
						<p className="text-sm text-destructive" role="alert">
							{errors.password.message}
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
				{isSubmitting ? "Signing in..." : "Sign in"}
			</Button>

			<p className="text-center text-sm text-muted-foreground">
				Need an account?{" "}
				<Link
					className="inline-flex min-h-11 items-center font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					href={getAuthPageHref("register", destination)}
				>
					Register
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
