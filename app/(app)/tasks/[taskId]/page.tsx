import { TaskDetailSection } from "@/features/tasks/components/task-detail-section";

type TaskDetailPageProps = {
	params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
	const { taskId } = await params;

	return <TaskDetailSection taskId={taskId} />;
}
