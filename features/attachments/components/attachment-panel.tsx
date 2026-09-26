"use client";

import { PaperclipIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/provider";
import { getApiErrorMessage } from "@/lib/api/error";

import {
	DEFAULT_ATTACHMENT_PAGE_SIZE,
	useAttachmentList,
	useDeleteAttachment,
	useDownloadAttachment,
	useUploadAttachment,
} from "../hooks";
import {
	ATTACHMENT_ACCEPT_ATTRIBUTE,
	type Attachment,
	validateAttachmentFile,
} from "../types";
import {
	createUploadEntry,
	isUploadInFlight,
	patchUploadEntry,
	removeUploadEntry,
	summarizeUploads,
	type UploadEntry,
} from "../upload-state";
import { AttachmentPreview, AttachmentRow, UploadRow } from "./attachment-row";

type AttachmentPanelProps = {
	projectId: string;
	taskId: string;
};

/** How long a confirmed upload stays on screen before it is cleared. */
const SUCCESS_DISPLAY_MS = 2500;

/**
 * Work deliverables attached to a task.
 *
 * A client guest never sees this panel, matching the server policy that rejects
 * every CLIENT before the project check. Hiding it is presentation only: the
 * list and download endpoints are what refuse the request, so there is nothing
 * for the browser to fetch even if the component were rendered.
 *
 * Nothing is added to the list optimistically. A row appears only once the
 * server has confirmed the file, which is why the upload queue is tracked
 * separately below and then invalidated into the real list.
 */
export function AttachmentPanel({ projectId, taskId }: AttachmentPanelProps) {
	const { user } = useAuth();
	const role = user?.role;
	const isClient = role === "CLIENT";
	// Both upload and removal follow the server's attachment policy: PM and an
	// internal project member may do either, and a client guest may do neither.
	// The panel is not rendered for a client at all, and the endpoints refuse one
	// before the project check.
	const canManage = role === "PM" || role === "INTERNAL";
	const canUpload = canManage;
	const canRemove = canManage;

	const [page, setPage] = useState(1);
	const listQuery = useAttachmentList(
		role,
		projectId,
		taskId,
		page,
		DEFAULT_ATTACHMENT_PAGE_SIZE,
	);
	const upload = useUploadAttachment(role, projectId, taskId);
	const remove = useDeleteAttachment(role, projectId, taskId);
	const download = useDownloadAttachment(projectId, taskId);

	const [queue, setQueue] = useState<UploadEntry[]>([]);
	const [dragActive, setDragActive] = useState(false);
	const [downloadError, setDownloadError] = useState<string | null>(null);
	const [preview, setPreview] = useState<Attachment | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const dragDepth = useRef(0);
	/**
	 * The `File` behind each queued entry, held in a ref rather than in state.
	 *
	 * A `File` is not serialisable, and putting one in state would make every
	 * progress tick re-render with a fresh object graph. A retry only ever needs
	 * the same file back, so a ref keyed by the entry is enough.
	 */
	const queueFiles = useRef(new Map<string, File>());

	const startUpload = useCallback(
		async (file: File, key: string) => {
			setQueue((entries) =>
				patchUploadEntry(entries, key, {
					status: "uploading",
					percent: 0,
					error: null,
				}),
			);
			try {
				const attachment = await upload.mutateAsync({
					file,
					onProgress: (percent) => {
						setQueue((entries) => patchUploadEntry(entries, key, { percent }));
					},
				});
				setQueue((entries) =>
					patchUploadEntry(entries, key, {
						status: "completed",
						percent: 100,
						attachment,
					}),
				);
				// The list is invalidated by the mutation, so a freshly uploaded
				// file shows up on the first page.
				setPage(1);
			} catch (error) {
				setQueue((entries) =>
					patchUploadEntry(entries, key, {
						status: "failed",
						percent: null,
						error: getApiErrorMessage(error),
					}),
				);
			}
		},
		[upload],
	);

	// A confirmed upload is only a receipt; clearing it keeps the panel from
	// growing a permanent duplicate of the list it just refreshed.
	useEffect(() => {
		const completed = queue.filter((entry) => entry.status === "completed");
		if (completed.length === 0) {
			return;
		}
		const timer = setTimeout(() => {
			setQueue((entries) =>
				entries.filter((entry) => entry.status !== "completed"),
			);
		}, SUCCESS_DISPLAY_MS);
		return () => clearTimeout(timer);
	}, [queue]);

	const addFiles = useCallback(
		(files: readonly File[]) => {
			if (files.length === 0) {
				return;
			}
			// Files are queued together and sent one request at a time. The API
			// takes a single file per call, so a sequential queue is the only
			// correct shape; firing them in parallel would just race the list
			// invalidation.
			const accepted: UploadEntry[] = [];
			for (const file of files) {
				const problem = validateAttachmentFile(file);
				if (problem !== null) {
					// Rejected before any request, so it is never sent and cannot
					// usefully be retried unchanged.
					accepted.push(createUploadEntry(file, "rejected", problem));
					continue;
				}
				const entry = createUploadEntry(file, "queued");
				queueFiles.current.set(entry.key, file);
				accepted.push(entry);
			}
			setQueue((entries) => [...entries, ...accepted]);

			void (async () => {
				for (const entry of accepted) {
					if (entry.status === "rejected") {
						continue;
					}
					const file = queueFiles.current.get(entry.key);
					if (file === undefined) {
						continue;
					}
					await startUpload(file, entry.key);
				}
			})();
		},
		[startUpload],
	);

	if (isClient) {
		return null;
	}

	const attachments = listQuery.data?.attachments ?? [];
	const pagination = listQuery.data?.pagination;
	const isBusy = isUploadInFlight(queue) || remove.isPending;

	function handleBrowse() {
		fileInputRef.current?.click();
	}

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		// Reset immediately so re-picking the same file fires another change.
		event.target.value = "";
		addFiles(files);
	}

	function handleDrop(event: React.DragEvent<HTMLElement>) {
		event.preventDefault();
		dragDepth.current = 0;
		setDragActive(false);
		if (!canUpload || isBusy) {
			return;
		}
		addFiles(Array.from(event.dataTransfer.files ?? []));
	}

	// Drag events fire for every descendant, so enter/leave are counted rather
	// than toggled: otherwise moving across child nodes flickers the highlight.
	function handleDragEnter(event: React.DragEvent<HTMLElement>) {
		event.preventDefault();
		dragDepth.current += 1;
		if (canUpload) {
			setDragActive(true);
		}
	}

	function handleDragLeave(event: React.DragEvent<HTMLElement>) {
		event.preventDefault();
		dragDepth.current = Math.max(0, dragDepth.current - 1);
		if (dragDepth.current === 0) {
			setDragActive(false);
		}
	}

	async function handleDownload(attachment: Attachment) {
		setDownloadError(null);
		try {
			await download(attachment);
		} catch (error) {
			setDownloadError(
				`Could not download ${attachment.fileName}: ${getApiErrorMessage(error)}`,
			);
		}
	}

	const summary = summarizeUploads(queue);

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
								? "Drop a design, a spec, or a screenshot here to attach it."
								: "Nothing has been attached to this task yet."
						}
					/>
				) : null}

				{attachments.length > 0 ? (
					<ul className="flex flex-col divide-y">
						{attachments.map((attachment) => (
							<AttachmentRow
								attachment={attachment}
								canRemove={canRemove}
								disabled={isBusy}
								key={attachment.id}
								onDownload={() => void handleDownload(attachment)}
								onPreview={() => setPreview(attachment)}
								onRemove={() => remove.mutate(attachment)}
							/>
						))}
					</ul>
				) : null}

				{pagination !== undefined && pagination.totalPages > 1 ? (
					<nav
						aria-label="Attachment pages"
						className="flex items-center justify-between gap-3 border-t pt-3"
					>
						<Button
							disabled={pagination.page <= 1 || isBusy}
							size="sm"
							type="button"
							variant="outline"
							onClick={() => setPage((current) => Math.max(1, current - 1))}
						>
							Previous
						</Button>
						<span className="text-xs text-muted-foreground">
							{`Page ${String(pagination.page)} of ${String(pagination.totalPages)}`}
						</span>
						<Button
							disabled={pagination.page >= pagination.totalPages || isBusy}
							size="sm"
							type="button"
							variant="outline"
							onClick={() =>
								setPage((current) =>
									Math.min(pagination.totalPages, current + 1),
								)
							}
						>
							Next
						</Button>
					</nav>
				) : null}

				{canUpload ? (
					// A button rather than a clickable div, so the drop target is reachable
					// by keyboard and announced as interactive. The file input is kept
					// outside it: nesting a file input in a button is invalid and swallows
					// the activation.
					<button
						aria-label="Choose files to attach, or drop files here"
						className={`flex flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-center transition-colors ${
							dragActive
								? "border-primary bg-primary/5"
								: "border-border hover:bg-accent/30"
						}`}
						disabled={isBusy}
						type="button"
						onClick={handleBrowse}
						onDragEnter={handleDragEnter}
						onDragLeave={handleDragLeave}
						onDragOver={(event) => event.preventDefault()}
						onDrop={handleDrop}
					>
						<PaperclipIcon
							aria-hidden="true"
							className="text-muted-foreground"
						/>
						<span className="text-sm font-medium">
							Drop files here, or choose them below
						</span>
						<span className="text-xs text-muted-foreground">
							PNG, JPEG, WebP, PDF, or ZIP up to 10 MB, several at a time. The
							server verifies the file contents, not just its name.
						</span>
						<span className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm">
							<UploadSimpleIcon aria-hidden="true" />
							Choose files
						</span>
					</button>
				) : null}

				<input
					accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
					aria-label="Choose files to attach"
					className="sr-only"
					multiple
					type="file"
					onChange={handleInputChange}
					ref={fileInputRef}
				/>

				{queue.length > 0 ? (
					<ul
						aria-live="polite"
						aria-label="Upload queue"
						className="flex flex-col gap-2"
					>
						{summary !== null ? (
							<li className="text-xs text-muted-foreground">{summary}</li>
						) : null}
						{queue.map((entry) => (
							<UploadRow
								entry={entry}
								key={entry.key}
								onDismiss={() => {
									queueFiles.current.delete(entry.key);
									setQueue((entries) => removeUploadEntry(entries, entry.key));
								}}
								onRetry={() => {
									const file = queueFiles.current.get(entry.key);
									if (file !== undefined) {
										void startUpload(file, entry.key);
									}
								}}
							/>
						))}
					</ul>
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

				{preview !== null ? (
					<AttachmentPreview
						projectId={projectId}
						taskId={taskId}
						attachment={preview}
						onClose={() => setPreview(null)}
					/>
				) : null}
			</CardContent>
		</Card>
	);
}
