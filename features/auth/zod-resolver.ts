import type {
	FieldError,
	FieldErrors,
	FieldValues,
	Resolver,
} from "react-hook-form";
import type { ZodType } from "zod";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function setNestedError(
	errors: FieldErrors<FieldValues>,
	path: readonly PropertyKey[],
	fieldError: FieldError,
): void {
	let target = errors as Record<string, unknown>;

	for (let index = 0; index < path.length; index += 1) {
		const key = String(path[index]);

		if (index === path.length - 1) {
			target[key] = fieldError;
			return;
		}

		const existing = target[key];
		if (!isRecord(existing)) {
			target[key] = {};
		}

		target = target[key] as Record<string, unknown>;
	}
}

export function zodResolver<TFieldValues extends FieldValues>(
	schema: ZodType<TFieldValues>,
): Resolver<TFieldValues> {
	return async (values) => {
		const result = await schema.safeParseAsync(values);

		if (result.success) {
			return {
				values: result.data,
				errors: {},
			};
		}

		const errors: FieldErrors<TFieldValues> = {};

		for (const issue of result.error.issues) {
			if (issue.path.length === 0) {
				continue;
			}

			setNestedError(errors as FieldErrors<FieldValues>, issue.path, {
				type: issue.code,
				message: issue.message,
			});
		}

		return {
			values: {},
			errors,
		};
	};
}
