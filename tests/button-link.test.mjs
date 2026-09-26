import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

import { Button, ButtonLink } from "../components/ui/button.tsx";

/** `ButtonLink` and `Button` are plain function components, so they can be called
 * directly to render markup without a DOM. */
const renderButtonLink = (props) =>
	renderToStaticMarkup(ButtonLink(props, undefined));

/** The class list as it ends up in the DOM, i.e. after `cn` resolved conflicting
 * Tailwind classes, so it is comparable between two renders. */
const classesOf = (html) => /class="([^"]*)"/.exec(html)?.[1].split(" ") ?? [];

describe("ButtonLink", () => {
	// The whole reason this component exists. Rendering the Base UI `button`
	// primitive with `render={<Link />}` produces a non-<button> element, which
	// Base UI rejects in development. Its suggested fix, `nativeButton={false}`,
	// would add `role="button"` to the anchor, so a navigation link would be
	// announced as a button and would lose the link affordances.
	test("renders a real anchor instead of borrowing button semantics", () => {
		const html = renderButtonLink({ href: "/projects" });

		expect(html).toStartWith("<a ");
		expect(html).toContain('href="/projects"');
		expect(html).not.toContain("role=");
	});

	test("keeps the href a link needs to be copyable and openable in a new tab", () => {
		const html = renderButtonLink({ href: "/projects/1111/tasks/2222" });

		expect(html).toContain('href="/projects/1111/tasks/2222"');
		expect(html).not.toContain('type="button"');
	});

	// It is called a link, but it has to keep looking like the button it replaced.
	// Comparing against the rendered `Button` avoids re-implementing the
	// conflict resolution in `cn`, where tailwind-merge already drops overridden
	// classes such as the base `border-transparent`.
	test.each(["default", "outline", "secondary", "ghost", "destructive"])(
		"looks identical to Button for the %s variant",
		(variant) => {
			expect(
				classesOf(renderButtonLink({ href: "/projects", variant })),
			).toEqual(
				classesOf(renderToStaticMarkup(Button({ variant }, undefined))),
			);
		},
	);

	test.each(["xs", "sm", "default", "lg", "icon"])(
		"looks identical to Button at the %s size",
		(size) => {
			expect(classesOf(renderButtonLink({ href: "/projects", size }))).toEqual(
				classesOf(renderToStaticMarkup(Button({ size }, undefined))),
			);
		},
	);

	test("merges a caller class name alongside the variant classes", () => {
		const classes = classesOf(
			renderButtonLink({
				href: "/projects",
				size: "sm",
				variant: "ghost",
				className: "min-h-11",
			}),
		);

		expect(classes).toContain("min-h-11");
		// tailwind-merge folds the caller's class into the same list, so the
		// variant classes are still present.
		for (const className of classesOf(
			renderToStaticMarkup(Button({ size: "sm", variant: "ghost" }, undefined)),
		)) {
			expect(classes).toContain(className);
		}
	});

	// A guard on the actual root cause: pointing the button primitive at a `Link`
	// is what Base UI complained about in the first place. This fails if the
	// pattern is reintroduced anywhere, so the fix cannot quietly regress.
	test("no Button renders a Link through its render prop", () => {
		const offenders = collectSourceFiles(["app", "components", "features"])
			.filter((file) => /<Button\b[^>]*?render=\{\s*<Link/.test(file.content))
			.map((file) => file.path);

		expect(offenders).toEqual([]);
	});
});

describe("Button", () => {
	// The existing control keeps its own semantics: a genuine button element,
	// which is what gives it the form and keyboard behaviour it is used for.
	test("still renders a native button element", () => {
		const html = renderToStaticMarkup(Button({ children: "Save" }, undefined));

		expect(html).toStartWith("<button ");
		expect(html).toContain('type="button"');
	});
});

function collectSourceFiles(roots) {
	const files = [];

	const walk = (directory) => {
		for (const entry of readdirSync(directory)) {
			const path = join(directory, entry);

			if (statSync(path).isDirectory()) {
				walk(path);
			} else if (/\.tsx?$/.test(entry)) {
				files.push({ path, content: readFileSync(path, "utf8") });
			}
		}
	};

	for (const root of roots) {
		walk(join(process.cwd(), root));
	}

	return files;
}
