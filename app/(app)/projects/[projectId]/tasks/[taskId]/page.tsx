import { ClientTaskDetailSection } from "@/features/projects/components/client-task-detail-section";

type ClientTaskDetailPageProps = {
	params: Promise<{ projectId: string; taskId: string }>;
};

/**
 * The client guest's task detail route.
 *
 * It is nested under the project rather than reusing `/tasks/[taskId]`, because
 * that route reads the internal task API, which refuses a client guest. Keeping
 * the two separate means the restricted surface is a different endpoint all the
 * way down, not the same page with fields hidden.
 */
export default async function ClientTaskDetailPage({
	params,
}: ClientTaskDetailPageProps) {
	const { projectId, taskId } = await params;

	return <ClientTaskDetailSection projectId={projectId} taskId={taskId} />;
}
