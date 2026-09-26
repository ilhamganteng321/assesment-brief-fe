import type { ReactNode } from "react";

import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";

type AuthShellProps = {
	eyebrow: string;
	title: string;
	description: string;
	children: ReactNode;
	footer: ReactNode;
};

export function AuthShell({
	eyebrow,
	title,
	description,
	children,
	footer,
}: AuthShellProps) {
	return (
		<main className="flex min-h-svh w-full max-w-md flex-col justify-center py-10">
			<Card>
				<CardHeader className="gap-2 px-6 pt-6">
					<p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
						{eyebrow}
					</p>
					<h1 className="font-heading text-2xl font-semibold tracking-tight">
						{title}
					</h1>
					<p className="text-sm text-muted-foreground">{description}</p>
				</CardHeader>
				<CardContent className="px-6">{children}</CardContent>
				<CardFooter className="justify-center border-t-0 px-6 pb-6 text-sm text-muted-foreground">
					{footer}
				</CardFooter>
			</Card>
		</main>
	);
}
