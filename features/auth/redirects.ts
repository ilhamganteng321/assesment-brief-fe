const INTERNAL_URL_ORIGIN = "https://application.invalid";
const UNSAFE_ENCODED_VALUE = /%(?:2f|5c|2e|0a|0d)/i;

export const DEFAULT_AUTHENTICATED_ROUTE = "/dashboard";

function firstValue(
	value: string | string[] | null | undefined,
): string | null {
	return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function hasControlCharacters(value: string): boolean {
	return [...value].some((character) => {
		const codePoint = character.charCodeAt(0);
		return codePoint <= 31 || codePoint === 127;
	});
}

function hasUnsafeEncodedValue(value: string): boolean {
	let decoded = value;

	for (let attempt = 0; attempt < 3; attempt += 1) {
		if (UNSAFE_ENCODED_VALUE.test(decoded)) {
			return true;
		}

		try {
			const nextValue = decodeURIComponent(decoded);
			if (nextValue === decoded) {
				return false;
			}
			decoded = nextValue;
		} catch {
			return true;
		}
	}

	return UNSAFE_ENCODED_VALUE.test(decoded);
}

export function getSafeInternalPath(
	value: string | string[] | null | undefined,
	fallback = DEFAULT_AUTHENTICATED_ROUTE,
): string {
	const candidate = firstValue(value);

	if (!candidate) {
		return fallback;
	}

	if (
		!candidate.startsWith("/") ||
		candidate.startsWith("//") ||
		candidate.includes("\\") ||
		hasControlCharacters(candidate) ||
		hasUnsafeEncodedValue(candidate)
	) {
		return fallback;
	}

	try {
		const url = new URL(candidate, INTERNAL_URL_ORIGIN);

		if (
			url.origin !== INTERNAL_URL_ORIGIN ||
			!url.pathname.startsWith("/") ||
			url.pathname.startsWith("//") ||
			url.pathname.includes("\\")
		) {
			return fallback;
		}

		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return fallback;
	}
}

export function isAuthPath(value: string): boolean {
	try {
		const pathname = new URL(value, INTERNAL_URL_ORIGIN).pathname.replace(
			/\/+$/,
			"",
		);

		return pathname === "/login" || pathname === "/register";
	} catch {
		return false;
	}
}

export function getPostAuthPath(
	value: string | string[] | null | undefined,
): string {
	const path = getSafeInternalPath(value);
	return isAuthPath(path) ? DEFAULT_AUTHENTICATED_ROUTE : path;
}

export function getAuthPageHref(
	page: "login" | "register",
	redirectTo?: string,
): string {
	const redirect = getPostAuthPath(redirectTo);

	if (redirect === DEFAULT_AUTHENTICATED_ROUTE) {
		return `/${page}`;
	}

	return `/${page}?redirect=${encodeURIComponent(redirect)}`;
}

export function getLoginPath(
	returnTo?: string,
	sessionExpired = false,
): string {
	const redirect = getPostAuthPath(returnTo);
	const searchParams = new URLSearchParams();

	if (redirect !== DEFAULT_AUTHENTICATED_ROUTE) {
		searchParams.set("redirect", redirect);
	}

	if (sessionExpired) {
		searchParams.set("reason", "session-expired");
	}

	const search = searchParams.toString();
	return search ? `/login?${search}` : "/login";
}
