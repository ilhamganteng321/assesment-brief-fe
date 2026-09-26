import type { ReactNode } from "react";

type AuthLayoutProps = {
	children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
	return (
		<div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
			{children}
		</div>
	);
}
