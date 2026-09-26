export function AuthLoading({
	className,
	label = "Loading your session...",
}: {
	className?: string;
	label?: string;
}) {
	return (
		<main
			className={`flex items-center justify-center p-6 ${className ?? ""}`}
			aria-busy="true"
		>
			<p
				className="flex items-center gap-2 text-sm text-muted-foreground"
				role="status"
			>
				<span
					aria-hidden="true"
					className="size-4 animate-pulse rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
				/>
				{label}
			</p>
		</main>
	);
}
