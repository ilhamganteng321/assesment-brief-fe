"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { cn } from "cn";

function DialogRoot(props: Dialog.Root.Props) {
	return <Dialog.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: Dialog.Trigger.Props) {
	return <Dialog.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: Dialog.Close.Props) {
	return <Dialog.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: Dialog.Popup.Props & { showCloseButton?: boolean }) {
	return (
		<Dialog.Portal>
			<Dialog.Backdrop
				data-slot="dialog-overlay"
				className="fixed inset-0 z-50 bg-foreground/40 transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
			/>
			<Dialog.Popup
				data-slot="dialog-content"
				className={cn(
					"fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-background p-6 shadow-lg outline-none transition-all duration-200 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton ? (
					<Dialog.Close
						aria-label="Close dialog"
						className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					>
						<XIcon aria-hidden="true" />
					</Dialog.Close>
				) : null}
			</Dialog.Popup>
		</Dialog.Portal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("flex flex-col gap-1.5 pr-8", className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
				className,
			)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: Dialog.Title.Props) {
	return (
		<Dialog.Title
			data-slot="dialog-title"
			className={cn(
				"font-heading text-lg leading-none font-semibold tracking-tight",
				className,
			)}
			{...props}
		/>
	);
}

function DialogDescription({ className, ...props }: Dialog.Description.Props) {
	return (
		<Dialog.Description
			data-slot="dialog-description"
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogRoot,
	DialogTitle,
	DialogTrigger,
};
