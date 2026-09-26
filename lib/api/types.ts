export type ApiErrorDetails = Record<string, unknown>;

export type ApiErrorPayload = {
	code: string;
	message: string;
	requestId?: string;
	[key: string]: unknown;
};

export type ApiSuccessResponse<T> = {
	success: true;
	data: T;
};

export type ApiFailureResponse = {
	success: false;
	error: ApiErrorPayload;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly requestId?: string;
	readonly details: ApiErrorDetails;

	constructor(
		message: string,
		options: {
			status?: number;
			code?: string;
			requestId?: string;
			details?: ApiErrorDetails;
		} = {},
	) {
		super(message);
		this.name = "ApiError";
		this.status = options.status ?? 0;
		this.code = options.code ?? "UNKNOWN_ERROR";
		this.requestId = options.requestId;
		this.details = options.details ?? {};
	}
}
