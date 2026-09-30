"use client";

import { PageBreadcrumbs, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { useAuth } from "@/features/auth/provider";
import { ProjectInvitationsSection } from "@/features/invitations/components/project-invitations-section";
import { normalizeApiError } from "@/lib/api/error";

import { useProjectDetail } from "../hooks";
import { ProjectDetailSkeleton } from "./project-detail-skeleton";
import { ProjectGeneralSettings } from "./project-general-settings";
import { ProjectStatusSettings } from "./project-status-settings";
import { ProjectTabs } from "./project-tabs";

/**
 * A project's settings.
 *
 * Loads the project itself rather than taking it as a prop, so a direct visit to
 * this URL — a bookmark, a shared link, a refresh — resolves the same project the
 * overview page does, with the same loading, not-found and error handling. It is
 * a separate page rather than a panel on the detail page so it can be linked to
 * on its own.
 *
 * Three sections, deliberately: the metadata that can be edited at will, the
 * lifecycle, which is a sequence of confirmed one-way moves and is never edited
 * as a field, and invitations, which is who has been *offered* the project — a
 * different fact from who is on it, kept in its own list so an unaccepted
 * invitation never appears to be a membership.
 */
export function ProjectSettingsSection({ projectId }: { projectId: string }) {
	const { user } = useAuth();
	const role = user?.role;
	const projectQuery = useProjectDetail(role, projectId);
	const project = projectQuery.data;

	if (projectQuery.isPending) {
		return <ProjectDetailSkeleton />;
	}

	if (projectQuery.isError) {
		const code = normalizeApiError(projectQuery.error).code;

		return (
			<QueryErrorState
				description={
					code === "PROJECT_NOT_FOUND"
						? "This project does not exist, or it has been deleted."
						: code === "PROJECT_ACCESS_DENIED"
							? "This project is not available to your account."
							: undefined
				}
				error={projectQuery.error}
				title={
					code === "PROJECT_ACCESS_DENIED"
						? "You do not have access to this project"
						: "Unable to load this project"
				}
				onRetry={() => void projectQuery.refetch()}
			/>
		);
	}

	if (!project) {
		return (
			<EmptyState
				title="Project not found"
				description="This project does not exist or is not available to you."
			/>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title={`${project.name} settings`}
				description="Manage this project's details and lifecycle."
			>
				<PageBreadcrumbs
					items={[
						{ label: "Projects", href: "/projects" },
						{ label: project.name, href: `/projects/${project.id}` },
						{ label: "Settings" },
					]}
				/>
			</PageHeader>

			<ProjectTabs activeSection="settings" projectId={project.id} />

			<ProjectGeneralSettings project={project} role={role} />

			<ProjectStatusSettings project={project} role={role} />

			<ProjectInvitationsSection project={project} />
		</div>
	);
}
