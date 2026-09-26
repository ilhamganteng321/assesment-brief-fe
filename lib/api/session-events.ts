import type { ApiError } from "./types";

type UnauthorizedListener = (
	error: ApiError,
	requestToken: string | null,
) => void;

let unauthorizedListener: UnauthorizedListener | null = null;

export function setUnauthorizedListener(
	listener: UnauthorizedListener | null,
): () => void {
	unauthorizedListener = listener;

	return () => {
		if (unauthorizedListener === listener) {
			unauthorizedListener = null;
		}
	};
}

export function notifyUnauthorized(
	error: ApiError,
	requestToken: string | null,
): void {
	unauthorizedListener?.(error, requestToken);
}
