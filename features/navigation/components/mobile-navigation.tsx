"use client";

import { ListIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { UserMenu } from "@/features/auth/components/user-menu";
import {
	AppNavigation,
	BrandMark,
} from "@/features/navigation/components/app-navigation";

export function MobileNavigation() {
	return (
		<Sheet>
			<SheetTrigger
				render={
					<Button
						aria-label="Open navigation menu"
						className="size-10 lg:hidden"
						size="icon"
						variant="outline"
					/>
				}
			>
				<ListIcon aria-hidden="true" weight="bold" />
			</SheetTrigger>
			<SheetContent className="w-80 max-w-[85vw] gap-0 p-0" side="left">
				<SheetHeader className="border-b px-6 py-5">
					<SheetTitle>Navigation</SheetTitle>
					<SheetDescription className="sr-only">
						Move between your dashboard, projects, and settings.
					</SheetDescription>
				</SheetHeader>
				<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
					<BrandMark />
					<AppNavigation />
				</div>
				<div className="flex items-center justify-between gap-2 border-t px-4 py-3">
					<span className="text-xs text-muted-foreground">Signed in</span>
					<UserMenu />
				</div>
			</SheetContent>
		</Sheet>
	);
}
