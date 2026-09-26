import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground",
				secondary: "border-transparent bg-secondary text-secondary-foreground",
				outline: "border-border bg-background text-foreground",
				muted: "border-transparent bg-muted text-muted-foreground",
				accent:
					"border-transparent bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
				destructive:
					"border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

type BadgeProps = React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<span
			data-slot="badge"
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
