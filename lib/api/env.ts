export function getBackendUrl(): string | undefined {
	const configuredUrl = process.env.NEXT_PUBLIC_BE_URL?.trim();

	if (!configuredUrl) {
		return undefined;
	}

	try {
		const url = new URL(configuredUrl);
		const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
		const usesInsecureRemoteUrl =
			url.protocol === "http:" &&
			process.env.NODE_ENV === "production" &&
			!isLoopback;

		if (
			(url.protocol !== "http:" && url.protocol !== "https:") ||
			usesInsecureRemoteUrl ||
			url.username ||
			url.password ||
			url.search ||
			url.hash
		) {
			return undefined;
		}

		return url.toString().replace(/\/+$/, "");
	} catch {
		return undefined;
	}
}
