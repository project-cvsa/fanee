import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createRuntime, createTranslator } from "../src/index";

describe("OTB Runtime", () => {
	let tempDir: string;

	async function createBundle(structure: Record<string, unknown>) {
		for (const [filePath, content] of Object.entries(structure)) {
			const fullPath = join(tempDir, filePath);
			const dir = join(fullPath, "..");
			await Bun.$`mkdir -p ${dir}`;
			if (typeof content === "string") {
				await writeFile(fullPath, content);
			} else {
				await writeFile(fullPath, JSON.stringify(content, null, 2));
			}
		}
	}

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "otb-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	test("initializes with valid manifest", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { greeting: "Hello" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		expect(t("greeting")).toBe("Hello");
	});

	test("translation function with locale works", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { greeting: "Hello" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t("en");
		expect(t("greeting")).toBe("Hello");
	});

	test("handles namespace hierarchy", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { rootKey: "root value" },
			"modules/web/manifest.json": { format: "otb", specVersion: "0.3.0" },
			"modules/web/messages/en.json": { webKey: "web value" },
			"modules/web/modules/billing/manifest.json": { format: "otb", specVersion: "0.3.0" },
			"modules/web/modules/billing/messages/en.json": { billingKey: "billing value" },
			"modules/web/modules/auth/manifest.json": { format: "otb", specVersion: "0.3.0" },
			"modules/web/modules/auth/messages/en.json": { authKey: "auth value" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });

		runtime.setContext({ namespace: "web" });
		const t = runtime.t();
		expect(t("rootKey")).toBe("root value");
		expect(t("webKey")).toBe("web value");

		runtime.setContext({ namespace: "web:billing" });
		const billingT = runtime.t();
		expect(billingT("rootKey")).toBe("root value");
		expect(billingT("webKey")).toBe("web value");
		expect(billingT("billingKey")).toBe("billing value");

		runtime.setContext({ namespace: "web:auth" });
		const authT = runtime.t();
		expect(authT("rootKey")).toBe("root value");
		expect(authT("webKey")).toBe("web value");
		expect(authT("authKey")).toBe("auth value");

		// setContext doesn't affect old translation functions
		expect(billingT("rootKey")).toBe("root value");
		expect(billingT("webKey")).toBe("web value");
		expect(billingT("billingKey")).toBe("billing value");
	});

	test("loads BCP-47 named resource files", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en-US.json": { greeting: "Hello, {name}!" },
			"messages/fr-FR.json": { greeting: "Bonjour, {name}!" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en-US" });

		runtime.setContext({ namespace: "", locale: "en-US" });
		expect(runtime.t()("greeting")).toBe("Hello, {name}!");

		runtime.setLocale("fr-FR");
		expect(runtime.t()("greeting")).toBe("Bonjour, {name}!");
	});

	test("merge algorithm - descendant overrides ancestor", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { key: "root", shared: "root shared" },
			"modules/web/manifest.json": { format: "otb", specVersion: "0.3.0" },
			"modules/web/messages/en.json": { key: "web", shared: "web shared" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });

		runtime.setContext({ namespace: "web" });
		const t = runtime.t();
		expect(t("key")).toBe("web");
		expect(t("shared")).toBe("web shared");
	});

	test("standalone module does not inherit ancestor data", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { key: "root value" },
			"modules/web/manifest.json": { format: "otb", specVersion: "0.3.0" },
			"modules/web/messages/en.json": { key: "web value" },
			"modules/web/modules/standalone/manifest.json": { format: "otb", specVersion: "0.3.0", standalone: true },
			"modules/web/modules/standalone/messages/en.json": { key: "standalone value" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });

		runtime.setContext({ namespace: "web" });
		expect(runtime.t()("key")).toBe("web value");

		runtime.setContext({ namespace: "web:standalone" });
		expect(runtime.t()("key")).toBe("standalone value");
	});

	test("locale fallback behavior", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { greeting: "Hello" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });

		runtime.setContext({ namespace: "", locale: "de" });
		expect(runtime.t()("greeting")).toBe("Hello");

		runtime.setContext({ namespace: "", locale: "fr" });
		expect(runtime.t()("missing")).toBe("missing");
	});

	test("createTranslator factory function", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { key: "value" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const translate = createTranslator(runtime, { namespace: "", locale: "en" });
		expect(translate("key")).toBe("value");
	});

	test("getLocales returns all available locales", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": {},
			"messages/fr.json": {},
			"messages/de.json": {},
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const locales = runtime.getLocales();
		expect(locales).toContain("en");
		expect(locales).toContain("fr");
		expect(locales).toContain("de");
	});

	test("returns key when not found", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { existing: "value" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		expect(t("nonexistent")).toBe("nonexistent");
		expect(t("existing")).toBe("value");
	});
});

describe("MF2 MessageFormat integration", () => {
	let tempDir: string;

	async function createBundle(structure: Record<string, unknown>) {
		for (const [filePath, content] of Object.entries(structure)) {
			const fullPath = join(tempDir, filePath);
			const dir = join(fullPath, "..");
			await Bun.$`mkdir -p ${dir}`;
			if (typeof content === "string") {
				await writeFile(fullPath, content);
			} else {
				await writeFile(fullPath, JSON.stringify(content, null, 2));
			}
		}
	}

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "mf2-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	test("MF2 variable interpolation", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { greeting: "Hello {$user}!" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		expect(t("greeting", { user: "Bob" })).toContain("Bob");
		expect(t("greeting", { user: "Bob" })).toContain("Hello");
	});

	test("MF2 multiple variables", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { item: "{$count} items - {$name}" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		expect(t("item", { count: 5, name: "Apples" })).toContain("5");
		expect(t("item", { count: 5, name: "Apples" })).toContain("Apples");
	});

	test("MF2 without variables returns raw value", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { greeting: "Hello {$user}!" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		expect(t("greeting")).toBe("Hello {$user}!");
	});

	test("MF2 empty vars returns raw value", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { greeting: "Hello {$user}!" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		expect(t("greeting", {})).toBe("Hello {$user}!");
	});

	test("MF2 number formatting", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			// biome-ignore lint/suspicious/noTemplateCurlyInString: this is a literal dollar symbol
			"messages/en.json": { price: "Total: ${$amount :number}" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		expect(t("price", { amount: 1234.56 })).toBe("Total: $1,234.56");
	});

	test("MF2 datetime formatting", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { date: "Today is {$today :datetime dateStyle=medium}" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		const result = t("date", { today: new Date("2024-02-02") });
		expect(result).toContain("Feb 2, 2024");
	});

	test("MF2 select", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": {
				"status": `.input {$gender :string} .match $gender male {{A man}} female {{A woman}} * {{Someone}}`,
			},
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		expect(t("status", { gender: "male" })).toContain("man");
		expect(t("status", { gender: "female" })).toContain("woman");
		expect(t("status", { gender: "other" })).toContain("Someone");
	});

	test("MF2 plural", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": {
				"items": `.input {$count :number} .match $count one {{a item}} * {{{$count} items}}`,
			},
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();
		expect(t("items", { count: 1 })).toContain("a item");
		expect(t("items", { count: 5 })).toContain("5 items");
	});

	test("MF2 locale-specific formatting", async () => {
		await createBundle({
			"manifest.json": { format: "otb", specVersion: "0.3.0" },
			"messages/en.json": { amount: "{$n :number}" },
			"messages/fr.json": { amount: "{$n :number}" },
		});

		const runtime = await createRuntime(tempDir, { defaultLocale: "en" });
		const t = runtime.t();

		runtime.setLocale("en");
		expect(t("amount", { n: 1234.56 })).toBe("1,234.56");

		runtime.setLocale("fr");
		expect(t("amount", { n: 1234.56 })).toContain("1 234,56");
	});
});
