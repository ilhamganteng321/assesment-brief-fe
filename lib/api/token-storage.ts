const ACCESS_TOKEN_KEY = "project-operations.auth.access-token";

const accessTokenListeners = new Set<() => void>();
let accessToken: string | null = null;
let accessTokenAvailable = false;
let storageInitialized = false;

function getSessionStorage(): Storage | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

function readStoredToken(): string | null {
	const storage = getSessionStorage();

	if (!storage) {
		return null;
	}

	try {
		const storedToken = storage.getItem(ACCESS_TOKEN_KEY);
		return storedToken?.trim() || null;
	} catch {
		return null;
	}
}

function initializeToken(): void {
	if (storageInitialized) {
		return;
	}

	accessToken = readStoredToken();
	accessTokenAvailable = accessToken !== null;
	storageInitialized = true;
}

function notifyAccessTokenChange(): void {
	accessTokenAvailable = accessToken !== null;

	for (const listener of accessTokenListeners) {
		listener();
	}
}

export function getAccessToken(): string | null {
	initializeToken();
	return accessToken;
}

export function subscribeToAccessToken(listener: () => void): () => void {
	accessTokenListeners.add(listener);
	return () => {
		accessTokenListeners.delete(listener);
	};
}

export function getAccessTokenAvailableSnapshot(): boolean {
	initializeToken();
	return accessTokenAvailable;
}

export function getServerAccessTokenAvailableSnapshot(): boolean {
	return false;
}

export function setAccessToken(token: string): void {
	accessToken = token;
	storageInitialized = true;

	try {
		getSessionStorage()?.setItem(ACCESS_TOKEN_KEY, token);
	} catch {
		notifyAccessTokenChange();
		return;
	}

	notifyAccessTokenChange();
}

export function clearAccessToken(): void {
	accessToken = null;
	storageInitialized = true;

	try {
		getSessionStorage()?.removeItem(ACCESS_TOKEN_KEY);
	} catch {
		notifyAccessTokenChange();
		return;
	}

	notifyAccessTokenChange();
}
