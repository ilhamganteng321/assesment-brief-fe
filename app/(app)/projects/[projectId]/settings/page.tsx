import { ProjectSettingsSection } from "@/features/projects/components/project-settings-section";

type ProjectSettingsPageProps = {
	params: Promise<{ projectId: string }>;
};

/**
 * A project's settings, at its own URL.
 *
 * Separate from the overview so it can be bookmarked and shared on its own, and
 * so the project is resolved by the same detail query the overview uses rather
 * than being passed down from a page that may not have run.
 */
export default async function ProjectSettingsPage({
	params,
}: ProjectSettingsPageProps) {
	const { projectId } = await params;

	return <ProjectSettingsSection projectId={projectId} />;
}
