import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { UserRole } from "@/features/auth/types";

import {
	deleteAttachment as deleteAttachmentRequest,
	downloadAttachment as downloadAttachmentRequest,
	listAttachments as listAttachmentsRequest,
	uploadAttachment as uploadAttachmentRequest,
} from "./api";
import type { Attachment } from "./types";

export const attachmentKeys = {
	all: ["attachments"] as const,
	lists: () => [...attachmentKeys.all, "list"] as const,
	list: (projectId: string, taskId: string) =>
		[...attachmentKeys.lists(), projectId, taskId] as const,
};

function isClientRole(role: UserRole | undefined): boolean {
	return role === "CLIENT";
}

/**
 * Attachments for one task.
 *
 * Disabled for a client guest because the server refuses them outright: the
 * policy rejects every CLIENT before the project check, since deliverables are
 * internal work product. The query is therefore not even attempted rather than
 * firing a request guaranteed to 403.
 */
export function useAttachmentList(
	role: UserRole | undefined,
	projectId: string,
	taskId: string,
) {
	return useQuery({
		queryKey: attachmentKeys.list(projectId, taskId),
		queryFn: async ({ signal }) =>
			listAttachmentsRequest(projectId, taskId, signal),
		enabled:
			Boolean(role) &&
			!isClientRole(role) &&
			projectId.length > 0 &&
			taskId.length > 0,
	});
}

/**
 * Mirrors `canUploadAttachment`: PM and INTERNAL may add deliverables, a client
 * guest may not. Checked before the request so an impossible action fails with a
 * readable message instead of a round trip; the server enforces the same rule.
 */
function assertCanUpload(role: UserRole | undefined): void {
	if (role !== "PM" && role !== "INTERNAL") {
		throw new Error("You do not have permission to upload attachments.");
	}
}

/** Mirrors `canDeleteAttachment`, which is PM-only. */
function assertCanDelete(role: UserRole | undefined): void {
	if (role !== "PM") {
		throw new Error("Only project managers can remove attachments.");
	}
}

/** Uploading is allowed for PM and INTERNAL alike, mirroring the server policy. */
export function useUploadAttachment(
	role: UserRole | undefined,
	projectId: string,
	taskId: string,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (file: File) => {
			assertCanUpload(role);
			return uploadAttachmentRequest(projectId, taskId, file);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: attachmentKeys.list(projectId, taskId),
			});
		},
	});
}

/** Removal is PM-only on the server, mirroring `canDeleteAttachment`. */
export function useDeleteAttachment(
	role: UserRole | undefined,
	projectId: string,
	taskId: string,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (attachment: Attachment) => {
			assertCanDelete(role);
			return deleteAttachmentRequest(projectId, taskId, attachment.id);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: attachmentKeys.list(projectId, taskId),
			});
		},
	});
}

/**
 * A download is a read, not a mutation, so it is exposed as a plain callback
 * rather than through the query cache.
 */
export function useDownloadAttachment(projectId: string, taskId: string) {
	return (attachment: Attachment) =>
		downloadAttachmentRequest(projectId, taskId, attachment);
}
