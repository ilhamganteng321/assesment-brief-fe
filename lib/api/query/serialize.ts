import { z } from "zod";

import {
	type ListQueryParams,
	ORDER_RULES,
	type QueryFilters,
	type RangeFilter,
} from "./types";

const orderRuleSchema = z.enum(ORDER_RULES);
const pageSchema = z.number().int().positive();
const rowsSchema = z.number().int().positive();
const fieldKeySchema = z.string().min(1);

export class ListQueryError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ListQueryError";
	}
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}

	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function isEmptyValue(value: unknown): boolean {
	if (value === null || value === undefined) {
		return true;
	}

	if (typeof value === "string") {
		return value.trim().length === 0;
	}

	if (Array.isArray(value)) {
		return value.length === 0;
	}

	if (isPlainRecord(value)) {
		return Object.keys(value).length === 0;
	}

	return false;
}

function pruneFilters(filters: QueryFilters | undefined): QueryFilters | null {
	if (filters === undefined) {
		return null;
	}

	if (!isPlainRecord(filters)) {
		throw new ListQueryError("filters must be a plain object");
	}

	const pruned: QueryFilters = {};

	for (const [key, value] of Object.entries(filters)) {
		if (isEmptyValue(value)) {
			continue;
		}

		if (Array.isArray(value)) {
			const members = value.filter((member) => !isEmptyValue(member));

			if (members.length === 0) {
				continue;
			}

			pruned[key] = members;
			continue;
		}

		pruned[key] = value;
	}

	return Object.keys(pruned).length > 0 ? pruned : null;
}

function pruneRangedFilters(
	rangedFilters: RangeFilter[] | undefined,
): RangeFilter[] | null {
	if (rangedFilters === undefined) {
		return null;
	}

	if (!Array.isArray(rangedFilters)) {
		throw new ListQueryError("rangedFilters must be an array");
	}

	const pruned: RangeFilter[] = [];

	for (const range of rangedFilters) {
		if (!isPlainRecord(range)) {
			throw new ListQueryError("each rangedFilters entry must be an object");
		}

		const keyResult = fieldKeySchema.safeParse(range.key);

		if (!keyResult.success) {
			throw new ListQueryError("each rangedFilters entry needs a key");
		}

		const hasStart = "start" in range && !isEmptyValue(range.start);
		const hasEnd = "end" in range && !isEmptyValue(range.end);

		if (!hasStart && !hasEnd) {
			continue;
		}

		pruned.push({
			key: keyResult.data,
			start: hasStart ? range.start : undefined,
			end: hasEnd ? range.end : undefined,
		} as RangeFilter);
	}

	return pruned.length > 0 ? pruned : null;
}

function assertPositiveInteger(
	value: number | undefined,
	schema: typeof pageSchema,
	name: string,
): number | null {
	if (value === undefined) {
		return null;
	}

	const result = schema.safeParse(value);

	if (!result.success) {
		throw new ListQueryError(`${name} must be a positive integer`);
	}

	return result.data;
}

/**
 * Converts the official list query contract into URL query parameters.
 *
 * `filters`, `searchFilters` and `rangedFilters` are JSON serialized, every
 * value is URL encoded, and undefined or empty values are omitted so the
 * backend never receives `filters=undefined` or `filters={}`.
 */
export function buildQueryParams(
	params: ListQueryParams = {},
): URLSearchParams {
	if (!isPlainRecord(params)) {
		throw new ListQueryError("list query params must be an object");
	}

	const searchParams = new URLSearchParams();
	const filters = pruneFilters(params.filters);
	const searchFilters = pruneFilters(params.searchFilters);
	const rangedFilters = pruneRangedFilters(params.rangedFilters);
	const page = assertPositiveInteger(params.page, pageSchema, "page");
	const rows = assertPositiveInteger(params.rows, rowsSchema, "rows");

	if (filters) {
		searchParams.set("filters", JSON.stringify(filters));
	}

	if (searchFilters) {
		searchParams.set("searchFilters", JSON.stringify(searchFilters));
	}

	if (rangedFilters) {
		searchParams.set("rangedFilters", JSON.stringify(rangedFilters));
	}

	if (page !== null) {
		searchParams.set("page", String(page));
	}

	if (rows !== null) {
		searchParams.set("rows", String(rows));
	}

	if (params.orderKey !== undefined) {
		const orderKeyResult = fieldKeySchema.safeParse(params.orderKey.trim());

		if (!orderKeyResult.success) {
			throw new ListQueryError("orderKey must be a non-empty string");
		}

		searchParams.set("orderKey", orderKeyResult.data);
	}

	if (params.orderRule !== undefined) {
		const orderRuleResult = orderRuleSchema.safeParse(params.orderRule);

		if (!orderRuleResult.success) {
			throw new ListQueryError("orderRule must be asc or desc");
		}

		searchParams.set("orderRule", orderRuleResult.data);
	}

	return searchParams;
}

export function buildQueryString(params: ListQueryParams = {}): string {
	return buildQueryParams(params).toString();
}
