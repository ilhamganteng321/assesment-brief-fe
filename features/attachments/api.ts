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
	query: { page?: number; limit?: number } = {},
	signal?: AbortSignal,
): Promise<AttachmentList> {
	const response = await apiClient.get<ApiSuccessResponse<AttachmentList>>(
		attachmentsPath(projectId, taskId),
		{ params: query, signal },
	);
	return response.data.data;
}

/**
 * The upload is multipart, so the file is sent as-is under the `file` field the
 * server reads. No `Content-Type` is set by hand: the browser has to add the
 * multipart boundary itself, and the shared API client knows to step aside for a
 * `FormData` body.
 *
 * `onProgress` is wired to axios' upload progress event. It is a progress
 * *indicator* only: the attachment is treated as existing solely once the server
 * confirms it, so a failed or cancelled transfer never leaves a row behind.
 */
export async function uploadAttachment(
	projectId: string,
	taskId: string,
	file: File,
	onProgress?: (percent: number) => void,
	signal?: AbortSignal,
): Promise<Attachment> {
	const form = new FormData();
	form.append("file", file);
	const response = await apiClient.post<
		ApiSuccessResponse<{ attachment: Attachment }>
	>(attachmentsPath(projectId, taskId), form, {
		signal,
		onUploadProgress: (event) => {
			if (onProgress === undefined) {
				return;
			}
			// `total` is missing when the body length is unknown, in which case
			// there is no meaningful percentage to report.
			if (event.total === undefined || event.total === 0) {
				return;
			}
			onProgress(
				Math.min(
					100,
					Math.max(0, Math.round((event.loaded / event.total) * 100)),
				),
			);
		},
	});
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
 * Fetches an attachment's bytes through the authenticated client.
 *
 * Separate from {@link downloadAttachment} because this half is pure I/O: it
 * needs the bearer token and returns a Blob, with no DOM involved. The download
 * helper layers the browser-only part on top. Keeping them apart means the
 * authorized fetch can be exercised without a document, and the preview can reuse
 * it directly.
 */
export async function fetchAttachmentBytes(
	projectId: string,
	taskId: string,
	attachmentId: string,
	signal?: AbortSignal,
): Promise<Blob> {
	const response = await apiClient.get<Blob>(
		`${attachmentsPath(projectId, taskId)}/${attachmentId}`,
		{ responseType: "blob", signal },
	);
	return toBlob(response.data);
}

/**
 * Saves an attachment to the user's device.
 *
 * The bytes go through the authenticated client rather than a plain link,
 * because the token is not a cookie and the API sets `withCredentials: false`,
 * so an anchor `href` would be an unauthenticated request answered with a 401.
 */
export async function downloadAttachment(
	projectId: string,
	taskId: string,
	attachment: Attachment,
): Promise<Blob> {
	const blob = await fetchAttachmentBytes(projectId, taskId, attachment.id);
	const objectUrl = URL.createObjectURL(blob);
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
	return blob;
}

/**
 * Normalises a binary response into a real `Blob`.
 *
 * A browser hands one back for `responseType: "blob"`, but other runtimes can
 * surface the raw bytes instead, and `URL.createObjectURL` rejects anything that
 * is not a Blob. Wrapping defensively keeps the download path working wherever it
 * runs instead of failing at the last step.
 */
function toBlob(data: unknown): Blob {
	if (data instanceof Blob) {
		return data;
	}
	if (data instanceof ArrayBuffer) {
		return new Blob([data]);
	}
	if (ArrayBuffer.isView(data)) {
		// Copied into a plain ArrayBuffer first: a view may sit on a shared or
		// resizable buffer, and neither is a valid `BlobPart`.
		const view = data as Uint8Array;
		const copy = new Uint8Array(view.byteLength);
		copy.set(view);
		return new Blob([copy.buffer]);
	}
	return new Blob([String(data)]);
}
