"use client";

import { Menu } from "@base-ui/react/menu";
import { cn } from "cn";
import type * as React from "react";

type DropdownMenuContentProps = Menu.Popup.Props &
	Pick<Menu.Positioner.Props, "align" | "side"> & {
		sideOffset?: Menu.Positioner.Props["sideOffset"];
	};

function DropdownMenu(props: Menu.Root.Props) {
	return <Menu.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props: Menu.Trigger.Props) {
	return <Menu.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
	className,
	align = "end",
	side = "bottom",
	sideOffset = 8,
	...props
}: DropdownMenuContentProps) {
	return (
		<Menu.Portal>
			<Menu.Positioner
				data-slot="dropdown-menu-positioner"
				align={align}
				side={side}
				sideOffset={sideOffset}
				className="z-50"
			>
				<Menu.Popup
					data-slot="dropdown-menu-content"
					className={cn(
						"flex min-w-[13rem] flex-col gap-1 origin-(--transform-origin) rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-md transition-[transform,scale,opacity] duration-150 ease-out outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
						className,
					)}
					{...props}
				/>
			</Menu.Positioner>
		</Menu.Portal>
	);
}

function DropdownMenuItem({ className, ...props }: Menu.Item.Props) {
	return (
		<Menu.Item
			data-slot="dropdown-menu-item"
			className={cn(
				"flex min-h-9 cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
				className,
			)}
			{...props}
		/>
	);
}

function DropdownMenuLabel({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dropdown-menu-label"
			className={cn(
				"px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase",
				className,
			)}
			{...props}
		/>
	);
}

function DropdownMenuSeparator({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<Menu.Separator
			data-slot="dropdown-menu-separator"
			className={cn("my-1 h-px bg-border", className)}
			{...props}
		/>
	);
}

export {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
};
