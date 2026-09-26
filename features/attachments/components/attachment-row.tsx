"use client";

import {
	ArrowClockwiseIcon,
	DownloadSimpleIcon,
	EyeIcon,
	TrashIcon,
	WarningCircleIcon,
	XIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/error";
import { formatDate } from "@/lib/format";

import { fetchAttachmentBytes } from "../api";
import {
	type Attachment,
	formatFileSize,
	getAttachmentMimeLabel,
	getPreviewKind,
} from "../types";
import { truncateFileName, type UploadEntry } from "../upload-state";

/**
 * One stored attachment.
 *
 * The name is truncated for layout, but the full value stays reachable twice
 * over: as a `title` for a pointer, and as the button's accessible label, so a
 * screen reader user is told which file they are about to download.
 */
export function AttachmentRow({
	attachment,
	canRemove,
	disabled,
	onDownload,
	onPreview,
	onRemove,
}: {
	attachment: Attachment;
	canRemove: boolean;
	disabled?: boolean;
	onDownload: () => void;
	onPreview: () => void;
	onRemove: () => void;
}) {
	const previewKind = getPreviewKind(attachment.mimeType);
	const displayName = truncateFileName(attachment.fileName);
	const canPreview = previewKind !== "none";

	return (
		<li className="flex flex-wrap items-center justify-between gap-3 py-3">
			<div className="flex min-w-0 flex-col gap-0.5">
				<p className="truncate font-medium" title={attachment.fileName}>
					{displayName}
					{/* The full name for assistive technology, since the visible
					    text above may be shortened. */}
					<span className="sr-only">{attachment.fileName}</span>
				</p>
				<p className="text-xs text-muted-foreground">
					{`${getAttachmentMimeLabel(attachment.mimeType)} · ${formatFileSize(
						attachment.fileSize,
					)} · ${attachment.uploadedBy.name} · ${formatDate(
						attachment.createdAt,
					)}`}
				</p>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				{canPreview ? (
					<Button
						aria-label={`Preview ${attachment.fileName}`}
						className="min-h-9"
						disabled={disabled}
						size="sm"
						type="button"
						variant="outline"
						onClick={onPreview}
					>
						<EyeIcon aria-hidden="true" />
						Preview
					</Button>
				) : null}
				<Button
					aria-label={`Download ${attachment.fileName}`}
					className="min-h-9"
					disabled={disabled}
					size="sm"
					type="button"
					variant="outline"
					onClick={onDownload}
				>
					<DownloadSimpleIcon aria-hidden="true" />
					Download
				</Button>
				{canRemove ? (
					<Button
						aria-label={`Remove ${attachment.fileName}`}
						className="min-h-9"
						disabled={disabled}
						size="sm"
						type="button"
						variant="ghost"
						onClick={onRemove}
					>
						<TrashIcon aria-hidden="true" />
					</Button>
				) : null}
			</div>
		</li>
	);
}

/**
 * One file in the upload queue.
 *
 * The progress bar is only rendered while a transfer is genuinely in flight, and
 * it carries `aria-valuenow` so the percentage is not conveyed by the bar's width
 * alone. A failure keeps its message on screen until it is dismissed or retried:
 * clearing it immediately would leave the user with no idea what went wrong.
 */
export function UploadRow({
	entry,
	onDismiss,
	onRetry,
}: {
	entry: UploadEntry;
	onDismiss: () => void;
	onRetry: () => void;
}) {
	const isFailed = entry.status === "failed" || entry.status === "rejected";
	const isUploading = entry.status === "uploading" || entry.status === "queued";
	const displayName = truncateFileName(entry.fileName);
	const percent = entry.percent;

	return (
		<li
			className="flex flex-col gap-1.5 rounded-lg border p-3"
			// A failure is announced so it is not missed while uploading others.
			role={isFailed ? "alert" : undefined}
		>
			<div className="flex items-center justify-between gap-2">
				<p className="truncate text-sm font-medium" title={entry.fileName}>
					{displayName}
					<span className="sr-only">{entry.fileName}</span>
				</p>
				<div className="flex shrink-0 items-center gap-1">
					{isFailed ? (
						<Button
							aria-label={`Retry uploading ${entry.fileName}`}
							className="min-h-8"
							disabled={entry.status === "rejected"}
							size="sm"
							type="button"
							variant="outline"
							onClick={onRetry}
						>
							<ArrowClockwiseIcon aria-hidden="true" />
							Retry
						</Button>
					) : null}
					<Button
						aria-label={`Dismiss ${entry.fileName}`}
						className="min-h-8"
						size="sm"
						type="button"
						variant="ghost"
						onClick={onDismiss}
					>
						<XIcon aria-hidden="true" />
					</Button>
				</div>
			</div>

			<p className="text-xs text-muted-foreground">
				{formatUploadStatus(entry, isFailed, isUploading)}
			</p>

			{entry.status === "uploading" && percent !== null ? (
				<div
					aria-label={`Uploading ${entry.fileName}: ${String(percent)}%`}
					aria-valuemax={100}
					aria-valuemin={0}
					aria-valuenow={percent}
					className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
					role="progressbar"
				>
					<div
						className="h-full rounded-full bg-primary transition-[width]"
						style={{ width: `${String(percent)}%` }}
					/>
				</div>
			) : null}

			{entry.status === "completed" ? (
				<p className="text-xs text-muted-foreground">
					{`${formatFileSize(entry.fileSize)} · stored`}
				</p>
			) : null}

			{isFailed && entry.error !== null ? (
				<p className="flex items-start gap-1.5 text-xs text-destructive">
					<WarningCircleIcon aria-hidden="true" className="mt-0.5 shrink-0" />
					{entry.error}
				</p>
			) : null}
		</li>
	);
}

function formatUploadStatus(
	entry: UploadEntry,
	isFailed: boolean,
	isUploading: boolean,
): string {
	switch (entry.status) {
		case "queued":
			return "Waiting to upload";
		case "uploading":
			return entry.percent === null
				? `Uploading ${entry.fileName}`
				: `Uploading ${entry.fileName} — ${String(entry.percent)}%`;
		case "completed":
			return `${entry.fileName} uploaded`;
		case "failed":
			return isFailed ? "Upload failed" : "";
		case "rejected":
			return "Not uploaded";
		default:
			return isUploading ? "Uploading" : "";
	}
}

/**
 * An inline preview of a stored file.
 *
 * The bytes are fetched through the authenticated client and shown from an
 * object URL, because the token is not a cookie: a bare `src` would be an
 * unauthenticated request and the endpoint would answer 401. A file type with no
 * useful inline representation says so and offers nothing else, rather than
 * rendering an empty frame.
 */
export function AttachmentPreview({
	projectId,
	taskId,
	attachment,
	onClose,
}: {
	projectId: string;
	taskId: string;
	attachment: Attachment;
	onClose: () => void;
}) {
	const kind = getPreviewKind(attachment.mimeType);
	const [state, setState] = useState<
		| { status: "loading" }
		| { status: "ready"; url: string }
		| { status: "error"; message: string }
	>({ status: "loading" });

	useEffect(() => {
		if (kind === "none") {
			return;
		}

		let cancelled = false;
		let objectUrl: string | null = null;
		const controller = new AbortController();

		void (async () => {
			try {
				const blob = await fetchAttachmentBytes(
					projectId,
					taskId,
					attachment.id,
					controller.signal,
				);
				objectUrl = URL.createObjectURL(blob);
				if (!cancelled) {
					setState({ status: "ready", url: objectUrl });
				}
			} catch (caught) {
				if (!cancelled) {
					setState({
						status: "error",
						message: getApiErrorMessage(caught),
					});
				}
			}
		})();

		return () => {
			cancelled = true;
			controller.abort();
			// The blob is released when the preview closes, otherwise every
			// preview the user ever opened would stay resident in memory.
			if (objectUrl !== null) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, [attachment.id, kind, projectId, taskId]);

	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="truncate text-sm font-medium" title={attachment.fileName}>
					{attachment.fileName}
				</p>
				<Button size="sm" type="button" variant="outline" onClick={onClose}>
					Close preview
				</Button>
			</div>

			{kind === "none" ? (
				<p className="text-sm text-muted-foreground">
					{`File preview unavailable. ${getAttachmentMimeLabel(
						attachment.mimeType,
					)} files cannot be shown inline — download the file to open it.`}
				</p>
			) : state.status === "loading" ? (
				<p className="text-sm text-muted-foreground">Loading preview...</p>
			) : state.status === "error" ? (
				<p className="text-sm text-destructive" role="alert">
					{`Could not load the preview: ${state.message}`}
				</p>
			) : kind === "image" ? (
				// next/image with `unoptimized`, rather than a raw img: the source is
				// an authenticated blob URL that exists only in this tab, so the
				// optimiser has nothing to fetch and would 401 server-side. Passing
				// `unoptimized` makes the component emit a plain image with our own
				// src, which is what this needs, and keeps the element typed and
				// sized instead of relying on a lint suppression.
				<Image
					alt={`Preview of ${attachment.fileName}`}
					className="max-h-96 w-full rounded-md border object-contain"
					height={768}
					src={state.url}
					unoptimized
					width={1024}
				/>
			) : (
				<object
					aria-label={`Preview of ${attachment.fileName}`}
					className="h-96 w-full rounded-md border"
					data={state.url}
					type="application/pdf"
				>
					<p className="p-3 text-sm">
						Your browser cannot display this PDF inline. Use the download button
						instead.
					</p>
				</object>
			)}
		</div>
	);
}
