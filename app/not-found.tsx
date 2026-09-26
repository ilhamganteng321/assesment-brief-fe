import Link from "next/link";

import { APP_NAME } from "@/lib/app-config";

export default function NotFound() {
	return (
		<main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
			<div className="flex w-full max-w-lg flex-col items-start gap-3 rounded-xl border bg-card p-6">
				<p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
					{APP_NAME}
				</p>
				<h1 className="font-heading text-2xl font-semibold tracking-tight">
					Page not found
				</h1>
				<p className="text-sm text-muted-foreground">
					The page you are looking for does not exist or has moved. Check the
					address, or head back to your dashboard.
				</p>
				<Link
					className="inline-flex min-h-9 items-center justify-center rounded-lg border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
					href="/dashboard"
				>
					Back to dashboard
				</Link>
			</div>
		</main>
	);
}
