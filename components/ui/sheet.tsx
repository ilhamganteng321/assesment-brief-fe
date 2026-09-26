"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { cn } from "cn";

const sheetSides = {
	left: "inset-y-0 left-0 h-full w-80 max-w-[85vw] border-r data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full",
	right:
		"inset-y-0 right-0 h-full w-80 max-w-[85vw] border-l data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
	top: "inset-x-0 top-0 max-h-[85vh] w-full border-b data-[ending-style]:-translate-y-full data-[starting-style]:-translate-y-full",
	bottom:
		"inset-x-0 bottom-0 max-h-[85vh] w-full border-t data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
} as const;

type SheetSide = keyof typeof sheetSides;

function Sheet(props: Dialog.Root.Props) {
	return <Dialog.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: Dialog.Trigger.Props) {
	return <Dialog.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: Dialog.Close.Props) {
	return <Dialog.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({
	side = "right",
	className,
	children,
	...props
}: Dialog.Popup.Props & { side?: SheetSide }) {
	return (
		<Dialog.Portal>
			<Dialog.Backdrop
				data-slot="sheet-overlay"
				className="fixed inset-0 z-50 bg-foreground/40 transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
			/>
			<Dialog.Popup
				data-slot="sheet-content"
				className={cn(
					"pointer-events-auto fixed z-50 flex flex-col gap-4 overflow-y-auto bg-background p-6 shadow-lg transition-transform duration-200 ease-out outline-none data-[ending-style]:duration-150",
					sheetSides[side],
					className,
				)}
				{...props}
			>
				{children}
				<Dialog.Close
					aria-label="Close panel"
					className="absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<XIcon aria-hidden="true" />
				</Dialog.Close>
			</Dialog.Popup>
		</Dialog.Portal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn("flex flex-col gap-1.5 pr-8", className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn("mt-auto flex flex-col gap-2", className)}
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: Dialog.Title.Props) {
	return (
		<Dialog.Title
			data-slot="sheet-title"
			className={cn(
				"font-heading text-lg leading-none font-semibold tracking-tight",
				className,
			)}
			{...props}
		/>
	);
}

function SheetDescription({ className, ...props }: Dialog.Description.Props) {
	return (
		<Dialog.Description
			data-slot="sheet-description"
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
};
