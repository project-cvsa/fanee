import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { analyze, generateTypes, type ToolsConfig } from "@/index";

describe("translation source analysis", () => {
	let root: string;
	let config: ToolsConfig;

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "fanee-tools-"));
		config = {
			bundlePath: "locale",
			sourceLocale: "en",
			sources: [{ include: ["src/**/*.tsx"], factories: [{ name: "useT" }] }],
		};
		await write("locale/manifest.json", { format: "otb", specVersion: "0.4.0" });
		await write("locale/messages/en.json", { hello: "Hello {$name}", unused: "Unused" });
		await write("locale/messages/fr.json", { hello: "Bonjour {$name}", unused: "Inutilisé" });
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	async function write(file: string, value: string | object) {
		const target = join(root, file);
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, typeof value === "string" ? value : JSON.stringify(value));
	}

	test("finds missing keys and interpolation variables from React or Solid translation calls", async () => {
		await write(
			"src/App.tsx",
			'function App() { const t = useT(); return <>{t("hello")}{t("missing")}</>; }'
		);
		const result = await analyze(config, root);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
			"variables",
			"missing-key",
		]);
		expect(result.unused.map((entry) => entry.key)).toEqual(["unused"]);
	});

	test("resolves scoped namespaces, inherited messages and custom translation factories", async () => {
		await write("locale/modules/shop/manifest.json", { format: "otb", specVersion: "0.4.0" });
		await write("locale/modules/shop/messages/en.json", { title: "Shop" });
		await write("locale/modules/shop/messages/fr.json", { title: "Boutique" });
		await write(
			"src/App.tsx",
			'function App() { const t = messages("shop"); return <>{t("hello", { name: "Ada" })}{t("title")}</>; }'
		);
		config.sources = [
			{ include: ["src/**/*.tsx"], factories: [{ name: "messages", argument: "namespace" }] },
		];
		const result = await analyze(config, root);
		expect(result.diagnostics).toEqual([]);
		expect(result.unused.map((entry) => entry.key)).toEqual(["unused"]);
	});

	test("validates a locale-only override against its inherited source message", async () => {
		await write("locale/modules/shop/manifest.json", { format: "otb", specVersion: "0.4.0" });
		await write("locale/modules/shop/messages/fr.json", { hello: "Bienvenue {$name}" });
		await write(
			"src/App.tsx",
			'function App() { const t = useT({ namespace: "shop" }); return t("hello", { name: "Ada" }); }'
		);
		const result = await analyze(config, root);
		expect(result.diagnostics).toEqual([]);
	});

	test("supports partial translations and optionally requires complete locale coverage", async () => {
		await write("locale/messages/fr.json", { hello: "Bonjour {$name}" });
		const partial = await analyze(config, root);
		expect(partial.diagnostics).toMatchObject([
			{ code: "missing-translation", severity: "warning" },
		]);
		const complete = await analyze({ ...config, missingTranslations: "error" }, root);
		expect(complete.diagnostics).toMatchObject([
			{ code: "missing-translation", severity: "error" },
		]);
	});

	test("keeps translations referenced by dynamic families and key maps", async () => {
		await write("locale/messages/en.json", {
			"status.ready": "Ready",
			"status.busy": "Busy",
			title: "Title",
			unused: "Unused",
		});
		await write("locale/messages/fr.json", {
			"status.ready": "Prêt",
			"status.busy": "Occupé",
			title: "Titre",
			unused: "Inutilisé",
		});
		const code = `const labels = { title: "title" }; function App() { const t = useT(); return <>{t(\`status.\${state}\`)}{t(labels.title)}</>; }`;
		await write("src/App.tsx", code);
		const result = await analyze(config, root);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["dynamic-key"]);
		expect(result.unused.map((entry) => entry.key)).toEqual(["unused"]);
	});

	test("separates translation bindings in sibling component scopes", async () => {
		await write("locale/modules/shop/manifest.json", { format: "otb", specVersion: "0.4.0" });
		await write("locale/modules/shop/messages/en.json", { title: "Shop" });
		await write("locale/modules/shop/messages/fr.json", { title: "Boutique" });
		await write(
			"src/App.tsx",
			'function A() { const t = useT(); return t("title"); } function B() { const t = useT({ namespace: "shop" }); return t("title"); }'
		);
		const result = await analyze(config, root);
		expect(
			result.diagnostics
				.filter((diagnostic) => diagnostic.code === "missing-key")
				.map((diagnostic) => diagnostic.message)
		).toEqual(["Unknown translation: /title"]);
	});

	test("supports server translators and caller-provided source transforms", async () => {
		await write("src/Page.component", "server.getT()");
		config.sources = [
			{
				include: ["src/**/*.component"],
				transform: () => 'server.getT()("hello", { name: "Ada" });',
			},
		];
		const result = await analyze(config, root);
		expect(result.diagnostics).toEqual([]);
		expect(result.references[0]?.pattern).toBe("hello");
	});

	test("reports duplicate keys, invalid messages and differing translated variables", async () => {
		await write(
			"locale/messages/en.json",
			'{"hello":"Hello {$name}","hello":"Hello {$name}","broken":"{$"}'
		);
		await write("locale/messages/fr.json", { hello: "Bonjour {$user}", broken: "Broken" });
		const result = await analyze(config, root);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("duplicate-key");
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-message"
		);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("variables");
	});

	test("generates message parameter types from resource definitions", async () => {
		const result = await analyze(config, root);
		expect(generateTypes(result)).toContain('"hello": { "name": unknown };');
	});

	test("leaves unrelated shadowed functions outside translation analysis", async () => {
		await write(
			"src/App.tsx",
			'function App() { const t = useT(); function echo(t: (key: string) => string) { return t("not-a-key"); } return t("hello", { name: "Ada" }); }'
		);
		const result = await analyze(config, root);
		expect(result.diagnostics).toEqual([]);
		expect(result.references.map((reference) => reference.pattern)).toEqual(["hello"]);
	});

	test("reports dynamic namespaces and keeps wildcard families with repeated suffixes", async () => {
		await write("locale/messages/en.json", { "label.extra.label": "Label" });
		await write("locale/messages/fr.json", { "label.extra.label": "Libellé" });
		await write(
			"src/App.tsx",
			'function App() { const t = useT(); const dynamic = useT(() => ({ namespace: current })); return t("label." + value + ".label"); }'
		);
		const result = await analyze(config, root);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
			"dynamic-namespace",
		]);
		expect(result.unused).toEqual([]);
	});

	test("the CLI resolves project paths from its config and can fail on unused messages", async () => {
		await write(
			"src/App.tsx",
			'function App() { const t = useT(); return t("hello", { name: "Ada" }); }'
		);
		await write("fanee.config.ts", `export default ${JSON.stringify(config)};`);
		const command = Bun.spawn({
			cmd: [
				process.execPath,
				join(import.meta.dir, "../src/cli.ts"),
				"check",
				"--config",
				join(root, "fanee.config.ts"),
				"--unused",
				"--json",
			],
			cwd: tmpdir(),
			stdout: "pipe",
			stderr: "pipe",
		});
		const output = await new Response(command.stdout).text();
		expect(await command.exited).toBe(1);
		const result: unknown = JSON.parse(output);
		expect(result).toMatchObject({ diagnostics: [], unused: [{ key: "unused" }] });
	});
});
