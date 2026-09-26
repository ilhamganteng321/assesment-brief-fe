import { apiClient } from "../lib/api/client";
import { normalizeApiError } from "../lib/api/error";

/**
 * Makes the smoke scripts wait out a rate limit instead of failing.
 *
 * These scripts drive far more requests per minute than a person clicking
 * around would, so they can legitimately trip the API's limiter. The API answers
 * a throttled request with `429` and the `retryAfter` it wants us to wait for,
 * and a well-behaved client honours that.
 *
 * The alternative would be raising `RATE_LIMIT_MAX` on the server for the
 * duration of the run. That is deliberately not done here: the limiter is a
 * production control, and a test that needs it switched off to pass is a test
 * that would not catch it being switched off by accident.
 */

const MAX_ATTEMPTS = 4;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retryAfterMs(error) {
	const details = normalizeApiError(error)?.details;

	if (details && typeof details.retryAfter === "number") {
		return Math.max(0, details.retryAfter) * 1000;
	}

	return 1000;
}

export function installRateLimitRetry() {
	apiClient.interceptors.response.use(
		(response) => response,
		async (error) => {
			const apiError = normalizeApiError(error);

			if (apiError?.status !== 429) {
				return Promise.reject(error);
			}

			error.config ??= {};
			const attempts = (error.config.__rateLimitAttempts ?? 0) + 1;
			error.config.__rateLimitAttempts = attempts;

			if (attempts > MAX_ATTEMPTS) {
				return Promise.reject(error);
			}

			const waitMs = retryAfterMs(error);
			process.stdout.write(
				`  [rate limited] waiting ${Math.round(waitMs / 1000)}s (attempt ${attempts}/${MAX_ATTEMPTS})\n`,
			);
			await sleep(waitMs);

			return apiClient.request(error.config);
		},
	);
}
