import { expect, test } from "bun:test";
import { createComponent } from "solid-js";
import { renderToString } from "solid-js/web";
import { FaneeRuntime } from "@fanee/core";
import { FaneeProvider, useT } from "../src/index";

test("renders independently scoped Solid trees on the server without a DOM", async () => {
	const resources = { shop: { en: { title: "Shop" }, fr: { title: "Boutique" } } };
	const english = new FaneeRuntime().config({ currentLocale: "en", resources });
	const french = new FaneeRuntime().config({ currentLocale: "fr", resources });
	await Promise.all([english.ready(), french.ready()]);
	const render = (runtime: FaneeRuntime) =>
		renderToString(() =>
			createComponent(FaneeProvider, {
				runtime,
				get children() {
					const t = useT({ namespace: "shop" });
					return t("title");
				},
			})
		);
	expect(render(english)).toBe("Shop");
	expect(render(french)).toBe("Boutique");
	await french.config({ resources: { shop: { fr: { title: "Nouvelle boutique" } } } }).ready();
	expect(render(french)).toBe("Nouvelle boutique");
	expect(render(english)).toBe("Shop");
});
