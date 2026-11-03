import { describe, test, expect } from "bun:test";
import { FaneeRuntime } from "../src/runtime";

describe("FaneeRuntime", () => {
	test("provides default state and translates with fallback", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "zh-CN",
			resources: {
				"": {
					en: { hello: "Hello", fallback_only: "Fallback Value" },
					"zh-CN": { hello: "你好" },
				},
			},
		});
		await runtime.ready();

		expect(runtime.t("hello")).toBe("你好");
		expect(runtime.t("fallback_only")).toBe("Fallback Value");
		expect(runtime.t("missing_key")).toBe("missing_key");
	});

	test("interpolates variables with MF2 MessageFormat", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
			resources: {
				"": {
					en: {
						greeting: "Hello, {$name}!",
						item_count: "You have {$count} items",
					},
				},
			},
		});
		await runtime.ready();

		expect(runtime.t("greeting", { name: "Antigravity" })).toContain("Antigravity");
		expect(runtime.t("item_count", { count: 42 })).toContain("42");
	});

	test("supports scoped translation functions via getT", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
			baseNamespace: "admin",
			resources: {
				admin: {
					en: { title: "Admin Portal" },
					ja: { title: "管理者ポータル" },
				},
				"admin:settings": {
					en: { save: "Save Changes" },
				},
			},
		});
		await runtime.ready();

		expect(runtime.t("title")).toBe("Admin Portal");

		const tJa = runtime.getT({ locale: "ja" });
		expect(tJa("title")).toBe("管理者ポータル");

		const tSettings = runtime.getT({ namespace: "settings" });
		expect(tSettings("save")).toBe("Save Changes");
	});

	test("translates all locales using tAll", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
			baseNamespace: "",
			resources: {
				"": {
					en: { welcome: "Welcome" },
					ja: { welcome: "ようこそ" },
					"zh-CN": { welcome: "欢迎" },
				},
			},
		});
		await runtime.ready();

		const all = runtime.tAll("welcome");
		expect(all).toEqual({
			en: "Welcome",
			ja: "ようこそ",
			"zh-CN": "欢迎",
		});
	});

	test("notifies subscribers on locale and resource changes", async () => {
		const runtime = new FaneeRuntime().config({
			defaultLocale: "en",
			currentLocale: "en",
		});
		await runtime.ready();

		let observedLocale = "";
		const unsub = runtime.subscribe((state) => {
			observedLocale = state.currentLocale;
		});

		runtime.setLocale("fr");
		expect(observedLocale).toBe("fr");

		unsub();
		runtime.setLocale("de");
		expect(observedLocale).toBe("fr");
	});

	test("executes plugins sequentially and awaits ready", async () => {
		const runtime = new FaneeRuntime();
		runtime
			.use(async (state) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return {
					...state,
					resources: {
						"": {
							en: { loaded: "From Plugin" },
						},
					},
				};
			})
			.config({ defaultLocale: "en", currentLocale: "en" });

		await runtime.ready();
		expect(runtime.t("loaded")).toBe("From Plugin");
	});
});
