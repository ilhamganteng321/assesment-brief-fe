"use client";

import {
	DownloadSimpleIcon,
	PaperclipIcon,
	TrashIcon,
	UploadSimpleIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/provider";
import { getApiErrorMessage } from "@/lib/api/error";
import { formatDate } from "@/lib/format";

import {
	useAttachmentList,
	useDeleteAttachment,
	useDownloadAttachment,
	useUploadAttachment,
} from "../hooks";
import {
	ATTACHMENT_ACCEPT_ATTRIBUTE,
	formatFileSize,
	getAttachmentMimeLabel,
	validateAttachmentFile,
} from "../types";

type AttachmentPanelProps = {
	projectId: string;
	taskId: string;
};

/**
 * Work deliverables attached to a task.
 *
 * A client guest never sees this panel, matching the server policy that rejects
 * every CLIENT before the project check. Hiding it is presentation only: the
 * list endpoint itself is what refuses the request.
 *
 * Uploading is available to PM and INTERNAL, removal is PM-only. Both mirror
 * `canUploadAttachment` / `canDeleteAttachment` so the buttons match the API,
 * and the API still re-checks on every call.
 */
export function AttachmentPanel({ projectId, taskId }: AttachmentPanelProps) {
	const { user } = useAuth();
	const role = user?.role;
	const isClient = role === "CLIENT";
	const canUpload = role === "PM" || role === "INTERNAL";
	const canRemove = role === "PM";

	const listQuery = useAttachmentList(role, projectId, taskId);
	const upload = useUploadAttachment(role, projectId, taskId);
	const remove = useDeleteAttachment(role, projectId, taskId);
	const download = useDownloadAttachment(projectId, taskId);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [localError, setLocalError] = useState<string | null>(null);
	const [downloadError, setDownloadError] = useState<string | null>(null);

	if (isClient) {
		return null;
	}

	const attachments = listQuery.data?.attachments ?? [];
	const isMutating = upload.isPending || remove.isPending;

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		// Reset immediately so re-picking the same file still fires a change.
		event.target.value = "";
		if (file === undefined) {
			return;
		}

		const problem = validateAttachmentFile(file);
		if (problem !== null) {
			setLocalError(problem);
			return;
		}

		setLocalError(null);
		upload.mutate(file, {
			onError: () => setLocalError(null),
		});
	}

	async function handleDownload(id: string, fileName: string) {
		setDownloadError(null);
		const attachment = attachments.find((row) => row.id === id);
		if (attachment === undefined) {
			return;
		}
		try {
			await download(attachment);
		} catch (error) {
			setDownloadError(
				`Could not download ${fileName}: ${getApiErrorMessage(error)}`,
			);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Attachments</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{listQuery.isPending ? (
					<div className="flex flex-col gap-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : null}

				{listQuery.isError ? (
					<QueryErrorState
						error={listQuery.error}
						title="Unable to load attachments"
						onRetry={() => void listQuery.refetch()}
					/>
				) : null}

				{listQuery.isSuccess && attachments.length === 0 ? (
					<EmptyState
						icon={<PaperclipIcon size={22} />}
						title="No attachments"
						description={
							canUpload
								? "Upload a design, a spec, or a screenshot for this task."
								: "Nothing has been attached to this task yet."
						}
					/>
				) : null}

				{attachments.length > 0 ? (
					<ul className="flex flex-col divide-y">
						{attachments.map((attachment) => (
							<li
								className="flex flex-wrap items-center justify-between gap-3 py-3"
								key={attachment.id}
							>
								<div className="flex min-w-0 flex-col gap-0.5">
									<p className="truncate font-medium">{attachment.fileName}</p>
									<p className="text-xs text-muted-foreground">
										{`${getAttachmentMimeLabel(attachment.mimeType)} · ${formatFileSize(
											attachment.fileSize,
										)} · ${attachment.uploadedBy.name} · ${formatDate(
											attachment.createdAt,
										)}`}
									</p>
								</div>
								<div className="flex shrink-0 items-center gap-2">
									<Button
										className="min-h-9"
										size="sm"
										type="button"
										variant="outline"
										onClick={() =>
											void handleDownload(attachment.id, attachment.fileName)
										}
									>
										<DownloadSimpleIcon aria-hidden="true" />
										Download
									</Button>
									{canRemove ? (
										<Button
											aria-label={`Remove ${attachment.fileName}`}
											className="min-h-9"
											disabled={isMutating}
											size="sm"
											type="button"
											variant="ghost"
											onClick={() => remove.mutate(attachment)}
										>
											<TrashIcon aria-hidden="true" />
										</Button>
									) : null}
								</div>
							</li>
						))}
					</ul>
				) : null}

				{canUpload ? (
					<div className="flex flex-col gap-2">
						<input
							accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
							aria-label="Choose a file to attach"
							className="sr-only"
							id="task-attachment-input"
							type="file"
							onChange={handleFileChange}
							ref={fileInputRef}
						/>
						<Button
							className="w-fit"
							disabled={isMutating}
							type="button"
							variant="outline"
							onClick={() => fileInputRef.current?.click()}
						>
							<UploadSimpleIcon aria-hidden="true" />
							{upload.isPending ? "Uploading..." : "Upload attachment"}
						</Button>
						<p className="text-xs text-muted-foreground">
							PNG, JPEG, WebP, PDF, or ZIP up to 10 MB. The server verifies the
							file contents, not just its name.
						</p>
					</div>
				) : null}

				{localError !== null ? (
					<p className="text-sm text-destructive" role="alert">
						{localError}
					</p>
				) : null}
				{upload.isError ? (
					<p className="text-sm text-destructive" role="alert">
						{getApiErrorMessage(upload.error)}
					</p>
				) : null}
				{remove.isError ? (
					<p className="text-sm text-destructive" role="alert">
						{getApiErrorMessage(remove.error)}
					</p>
				) : null}
				{downloadError !== null ? (
					<p className="text-sm text-destructive" role="alert">
						{downloadError}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}
