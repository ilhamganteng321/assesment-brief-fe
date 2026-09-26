import {
	DEFAULT_TASK_LIST_STATE,
	serializeTaskListState,
	type TaskListState,
} from "@/features/tasks/list-state";
import type { TaskStatus } from "@/features/tasks/types";

/**
 * A metric tile that can be drilled into.
 *
 * The link is a real URL rather than a click handler that flips local state: the
 * filtered board is then shareable, survives a refresh, and works with browser
 * back and forward, which hidden component state cannot do.
 */
export type MetricCard = {
	label: string;
	value: number;
	/** Shown under the number, e.g. "of 24 tasks". */
	hint?: string;
	/**
	 * The task-list criteria this card opens. `null` means the card is a summary
	 * only and is deliberately not clickable.
	 */
	drilldown: Partial<TaskListState> | null;
};

/**
 * Builds the task-board URL for a set of criteria.
 *
 * The project is always carried in the URL so the board opens already scoped, and
 * the view is forced to the list because a metric count is a list of tasks rather
 * than a set of columns.
 */
export function buildMetricDrilldownHref(
	projectId: string,
	criteria: Partial<TaskListState>,
): string {
	const params = serializeTaskListState({
		...DEFAULT_TASK_LIST_STATE,
		...criteria,
		projectId,
		view: "list",
	});
	const query = params.toString();
	return query.length > 0 ? `/tasks?${query}` : "/tasks";
}

/**
 * The drilldown for each status count.
 *
 * `DONE` and the others map straight onto the status filter, which the server
 * applies. Blocked is not a status a client may set, so it uses the calculated
 * `isBlocked` filter instead — the same distinction the board itself draws when
 * it shows BLOCKED as a view column.
 */
export function statusDrilldown(status: TaskStatus): Partial<TaskListState> {
	if (status === "BLOCKED") {
		return { blocked: "only", status: "all" };
	}
	return { status };
}

/**
 * A row of headline counts, each optionally linking into the filtered board.
 *
 * `null` is rendered as a skeleton rather than a zero, so a dashboard mid-load
 * never asserts "0 tasks" about a project it has not asked yet.
 */
export function toMetricCards(input: {
	total: number;
	completed: number;
	inProgress: number;
	blocked: number;
	todo: number;
	/** False while the counts are still being fetched. */
	loaded: boolean;
	/** Whether a filtered board can be opened at all. */
	canDrilldown: boolean;
}): readonly MetricCard[] {
	const { total } = input;

	// Built in one place so the "no drilldown available" case cannot be undone by
	// a later spread: merging `null` and then overlaying criteria would silently
	// bring the link back.
	const withCriteria = (
		criteria: Partial<TaskListState>,
	): Partial<TaskListState> | null => (input.canDrilldown ? criteria : null);

	return [
		{
			label: "Total tasks",
			value: total,
			drilldown: withCriteria({ status: "all", blocked: "any" }),
		},
		{
			label: "Completed",
			value: input.completed,
			hint:
				total > 0
					? `${String(input.completed)} of ${String(total)}`
					: undefined,
			drilldown: withCriteria(statusDrilldown("DONE")),
		},
		{
			label: "In progress",
			value: input.inProgress,
			drilldown: withCriteria(statusDrilldown("IN_PROGRESS")),
		},
		{
			label: "Blocked",
			value: input.blocked,
			drilldown: withCriteria(statusDrilldown("BLOCKED")),
		},
		{
			label: "To do",
			value: input.todo,
			drilldown: withCriteria(statusDrilldown("TODO")),
		},
	];
}
