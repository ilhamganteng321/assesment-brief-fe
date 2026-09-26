import { apiClient } from "@/lib/api/client";
import type { ApiSuccessResponse } from "@/lib/api/types";

import type { Attachment, AttachmentList } from "./types";

/**
 * Attachments live under the project-scoped task route, matching the server's
 * `/projects/:projectId/tasks/:taskId/attachments` contract.
 */
function attachmentsPath(projectId: string, taskId: string): string {
	return `/projects/${projectId}/tasks/${taskId}/attachments`;
}

export async function listAttachments(
	projectId: string,
	taskId: string,
	signal?: AbortSignal,
): Promise<AttachmentList> {
	const response = await apiClient.get<ApiSuccessResponse<AttachmentList>>(
		attachmentsPath(projectId, taskId),
		{ signal },
	);
	return response.data.data;
}

/**
 * The upload is multipart, so the file is sent as-is under the `file` field the
 * server reads. No `Content-Type` is set by hand: the browser has to add the
 * multipart boundary itself.
 */
export async function uploadAttachment(
	projectId: string,
	taskId: string,
	file: File,
): Promise<Attachment> {
	const form = new FormData();
	form.append("file", file);
	const response = await apiClient.post<
		ApiSuccessResponse<{ attachment: Attachment }>
	>(attachmentsPath(projectId, taskId), form);
	return response.data.data.attachment;
}

export async function deleteAttachment(
	projectId: string,
	taskId: string,
	attachmentId: string,
): Promise<void> {
	await apiClient.delete(
		`${attachmentsPath(projectId, taskId)}/${attachmentId}`,
	);
}

/**
 * Download an attachment.
 *
 * The response is a binary stream rather than the JSON envelope every other
 * endpoint returns, so it is fetched as a blob through the authenticated client
 * and handed to the browser as an object URL. A plain anchor cannot be used
 * because the bearer token lives in the interceptor, not in a cookie, and the API
 * sets `withCredentials: false` so there is no ambient session to fall back on.
 */
export async function downloadAttachment(
	projectId: string,
	taskId: string,
	attachment: Attachment,
): Promise<void> {
	const response = await apiClient.get<Blob>(
		`${attachmentsPath(projectId, taskId)}/${attachment.id}`,
		{ responseType: "blob" },
	);
	const objectUrl = URL.createObjectURL(response.data);
	try {
		const anchor = document.createElement("a");
		anchor.href = objectUrl;
		anchor.download = attachment.fileName;
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
	} finally {
		// Revoking immediately would race the download in some browsers, so the
		// URL is released on the next tick instead.
		setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
	}
}
