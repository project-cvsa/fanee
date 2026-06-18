// @ts-nocheck - test file uses h() which has loose types compared to JSX
import { afterEach, describe, test, expect } from "bun:test";
import { render } from "solid-js/web";
import { createComponent } from "solid-js";
import h from "solid-js/h";
import { FaneeRuntime } from "@fanee/core";
import { FaneeProvider, useT, useLocale, useSetLocale, useFanee } from "@/index";

function TestComponent() {
	const t = useT();
	const locale = useLocale();
	const setLocale = useSetLocale();
	const fanee = useFanee();

	return h("div", null,
		h("p", { "data-testid": "greeting" }, () => t("hello")),
		h("p", { "data-testid": "locale" }, locale),
		h("button", { type: "button", "data-testid": "switch", onClick: () => setLocale("fr") }, "Switch"),
		h("p", { "data-testid": "runtime-locale" }, () => fanee.runtime.getLocale()),
	);
}

function renderToDiv(element: () => unknown): [HTMLElement, () => void] {
	const div = document.createElement("div");
	document.body.appendChild(div);
	const dispose = render(element, div);
	return [div, () => {
		dispose();
		div.remove();
	}];
}

/** Wait for Solid's batched effects to flush */
function flush() {
	return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function renderWithProvider(runtime: FaneeRuntime): Promise<[HTMLElement, () => void]> {
	await runtime.ready();
	const [div, dispose] = renderToDiv(() =>
		createComponent(FaneeProvider, {
			runtime,
			children: h(TestComponent, {}),
		})
	);
	await flush();
	return [div, dispose];
}

describe("@fanee/solid", () => {
	let cleanup: (() => void) | undefined;

	afterEach(() => {
		cleanup?.();
		cleanup = undefined;
	});

	test("translates keys using runtime resources", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
			resources: {
				"": {
					en: { hello: "Hello" },
				},
			},
		});

		const [div, dispose] = await renderWithProvider(runtime);
		cleanup = dispose;
		expect(div.querySelector('[data-testid="greeting"]')?.textContent).toBe("Hello");
	});

	test("reacts to locale changes", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
			resources: {
				"": {
					en: { hello: "Hello" },
					fr: { hello: "Bonjour" },
				},
			},
		});

		const [div, dispose] = await renderWithProvider(runtime);
		cleanup = dispose;
		expect(div.querySelector('[data-testid="greeting"]')?.textContent).toBe("Hello");
		expect(div.querySelector('[data-testid="locale"]')?.textContent).toBe("en");

		const btn = div.querySelector('[data-testid="switch"]') as HTMLButtonElement;
		btn.click();
		await flush();

		expect(div.querySelector('[data-testid="greeting"]')?.textContent).toBe("Bonjour");
		expect(div.querySelector('[data-testid="locale"]')?.textContent).toBe("fr");
	});

	test("useT respects namespace context", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
			resources: {
				"": {
					en: { hello: "Hello" },
				},
				errors: {
					en: { hello: "Error hello" },
				},
			},
		});

		function Namespaced() {
			const t = useT({ namespace: "errors" });
			return h("p", { "data-testid": "namespaced" }, () => t("hello"));
		}

		await runtime.ready();
		const [div, dispose] = renderToDiv(() =>
			createComponent(FaneeProvider, {
				runtime,
				children: h(Namespaced, {}),
			})
		);
		await flush();
		cleanup = dispose;

		expect(div.querySelector('[data-testid="namespaced"]')?.textContent).toBe("Error hello");
	});
});
