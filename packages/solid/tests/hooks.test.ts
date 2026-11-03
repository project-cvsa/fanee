import { expect, test, describe } from "bun:test";
import { createComponent } from "solid-js";
import { renderToString } from "solid-js/web";
import { FaneeRuntime } from "@fanee/core";
import { FaneeProvider, useFanee, useLocale, useT } from "../src/index";

describe("Solid bindings", () => {
	test("renders translations and accesses context in SSR", async () => {
		const runtime = new FaneeRuntime().config({
			currentLocale: "zh-CN",
			defaultLocale: "en",
			resources: {
				"": {
					en: { hello: "Hello" },
					"zh-CN": { hello: "你好" },
				},
			},
		});
		await runtime.ready();

		const output = renderToString(() =>
			createComponent(FaneeProvider, {
				runtime,
				get children() {
					const { locale } = useFanee();
					const t = useT();
					return `${locale()}: ${t("hello")}`;
				},
			})
		);

		expect(output).toBe("zh-CN: 你好");
	});

	test("useLocale accesses active locale in SSR", async () => {
		const runtime = new FaneeRuntime().config({ currentLocale: "ja" });
		await runtime.ready();

		const output = renderToString(() =>
			createComponent(FaneeProvider, {
				runtime,
				get children() {
					const locale = useLocale();
					return locale();
				},
			})
		);

		expect(output).toBe("ja");
	});

	test("useT resolves scoped namespaces in SSR", async () => {
		const runtime = new FaneeRuntime().config({
			currentLocale: "en",
			resources: {
				shop: { en: { cart: "Shopping Cart" } },
			},
		});
		await runtime.ready();

		const output = renderToString(() =>
			createComponent(FaneeProvider, {
				runtime,
				get children() {
					const t = useT({ namespace: "shop" });
					return t("cart");
				},
			})
		);

		expect(output).toBe("Shopping Cart");
	});
});
