import { ProjectDetailSection } from "@/features/projects/components/project-detail-section";

type ProjectDetailPageProps = {
	params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({
	params,
}: ProjectDetailPageProps) {
	const { projectId } = await params;

	return <ProjectDetailSection projectId={projectId} />;
}
