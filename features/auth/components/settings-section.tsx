"use client";

import {
	BuildingsIcon,
	EnvelopeSimpleIcon,
	IdentificationCardIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth/provider";
import { getRoleLabel } from "@/features/auth/role-labels";

function formatDepartment(department: string): string {
	return department
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

type DetailRowProps = {
	icon: ReactNode;
	label: string;
	value: string;
};

function DetailRow({ icon, label, value }: DetailRowProps) {
	return (
		<div className="flex items-start gap-3 rounded-lg border p-3">
			<span
				aria-hidden="true"
				className="mt-0.5 text-muted-foreground [&_svg]:size-4"
			>
				{icon}
			</span>
			<div className="flex flex-col gap-0.5">
				<dt className="text-xs text-muted-foreground">{label}</dt>
				<dd className="text-sm font-medium break-words">{value}</dd>
			</div>
		</div>
	);
}

export function SettingsSection() {
	const { user } = useAuth();

	if (!user) {
		return null;
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Settings"
				description="Account details provided by your workspace."
			/>
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>
						These details come from your account and cannot be changed here.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<DetailRow
							icon={<IdentificationCardIcon />}
							label="Full name"
							value={user.name}
						/>
						<DetailRow
							icon={<EnvelopeSimpleIcon />}
							label="Email"
							value={user.email}
						/>
						<DetailRow
							icon={<BuildingsIcon />}
							label="Role"
							value={getRoleLabel(user.role)}
						/>
						<DetailRow
							icon={<IdentificationCardIcon />}
							label="Department"
							value={formatDepartment(user.department)}
						/>
					</dl>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Session</CardTitle>
					<CardDescription>
						Sign out from the account menu in the top bar when you are on a
						shared device.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	);
}
