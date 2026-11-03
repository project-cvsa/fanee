import { describe, expect, test } from "bun:test";
import { FaneeRuntime } from "@fanee/core";

describe("runtime resource updates", () => {
	test("falls back per message for empty and partially translated locales", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			resources: {
				"": {
					en: { greeting: "Hello", amount: "{$value :number}" },
					fr: { greeting: "Bonjour" },
					de: {},
				},
			},
		});
		await runtime.ready();
		expect(runtime.getT({ locale: "fr" })("greeting")).toBe("Bonjour");
		expect(runtime.getT({ locale: "fr" })("amount", { value: 1234.5 })).toBe("1,234.5");
		expect(runtime.getT({ locale: "de" })("greeting")).toBe("Hello");
		expect(runtime.getT({ locale: "fr" })("missing")).toBe("missing");
	});

	test("publishes replacement resources and preserves bound translation context", async () => {
		const runtime = new FaneeRuntime().config({
			resources: { "": { en: { greeting: "Hello" } }, shop: { en: { greeting: "Shop" } } },
		});
		await runtime.ready();
		const bound = runtime.getT({ namespace: "shop" });
		const translated: string[] = [];
		const unsubscribe = runtime.subscribe(() => translated.push(runtime.t("greeting")));
		await runtime.config({ resources: { "": { en: { greeting: "Updated" } } } }).ready();
		expect(translated).toEqual(["Updated"]);
		expect(bound("greeting")).toBe("Shop");
		expect(runtime.getT()("greeting")).toBe("Updated");
		unsubscribe();
	});
});
