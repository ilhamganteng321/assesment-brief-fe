import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { PublicOnlyRoute } from "@/features/auth/route-guard";

export default async function RegisterPage({
	searchParams,
}: PageProps<"/register">) {
	const params = await searchParams;
	const rawRedirect = params.redirect;
	const redirectTo = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;

	return (
		<PublicOnlyRoute redirectTo={redirectTo}>
			<AuthShell
				eyebrow="Project Operations"
				title="Create your account"
				description="Set up your workspace access in a few steps."
				footer="Your account is protected by the organization sign-in policy."
			>
				<RegisterForm redirectTo={redirectTo} />
			</AuthShell>
		</PublicOnlyRoute>
	);
}
