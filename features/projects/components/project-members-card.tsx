"use client";

import { UsersIcon } from "@phosphor-icons/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";

import type { ProjectMember } from "../types";

type ProjectMembersCardProps = {
	members: ProjectMember[] | undefined;
	isLoading: boolean;
};

export function ProjectMembersCard({
	members,
	isLoading,
}: ProjectMembersCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="inline-flex items-center gap-2">
					<UsersIcon aria-hidden="true" />
					Members
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<p className="text-sm text-muted-foreground">Loading members...</p>
				) : members && members.length > 0 ? (
					<ul className="flex flex-col divide-y">
						{members.map((member) => (
							<li
								className="flex items-center justify-between gap-3 py-2"
								key={member.id}
							>
								<div className="flex flex-col">
									<span className="text-sm font-medium">
										{member.user.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{member.user.email}
									</span>
								</div>
								<span className="text-xs text-muted-foreground">
									Added {formatDate(member.createdAt)}
								</span>
							</li>
						))}
					</ul>
				) : (
					<EmptyState
						className="border-0 bg-transparent px-0 py-6"
						icon={<UsersIcon size={20} />}
						title="No members yet"
						description="Assigned internal members will appear here."
					/>
				)}
			</CardContent>
		</Card>
	);
}
