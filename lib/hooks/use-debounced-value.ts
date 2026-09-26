"use client";

import { useEffect, useState } from "react";

export const DEFAULT_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(
	value: T,
	delayMs: number = DEFAULT_DEBOUNCE_MS,
): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			setDebouncedValue(value);
		}, delayMs);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [value, delayMs]);

	return debouncedValue;
}
