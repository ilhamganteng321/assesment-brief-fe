import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { PublicOnlyRoute } from "@/features/auth/route-guard";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
	const params = await searchParams;
	const rawRedirect = params.redirect;
	const redirectTo = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;

	return (
		<PublicOnlyRoute redirectTo={redirectTo}>
			<AuthShell
				eyebrow="Project Operations"
				title="Welcome back"
				description="Sign in to continue to your workspace."
				footer="Use your organization account to access the workspace."
			>
				<LoginForm redirectTo={redirectTo} />
			</AuthShell>
		</PublicOnlyRoute>
	);
}
