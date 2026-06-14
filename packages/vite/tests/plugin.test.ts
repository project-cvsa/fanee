import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { fanee } from "@/index";

async function createBundle(root: string, structure: Record<string, unknown>) {
	for (const [filePath, content] of Object.entries(structure)) {
		const fullPath = join(root, filePath);
		const dir = join(fullPath, "..");
		await Bun.$`mkdir -p ${dir}`;
		if (typeof content === "string") {
			await writeFile(fullPath, content);
		} else {
			await writeFile(fullPath, JSON.stringify(content, null, 2));
		}
	}
}

type ResolveIdHook = (
	this: unknown,
	source: string,
	importer: string | undefined,
	options: { isEntry: boolean }
) => Promise<string | null | undefined>;
type LoadHook = (this: unknown, id: string) => Promise<string | null | undefined>;

describe("fanee vite plugin", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "fanee-plugin-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	test("resolves the default virtual module id", async () => {
		const plugin = fanee({ bundlePath: tempDir });
		const resolved = await (plugin.resolveId as ResolveIdHook).call(
			undefined,
			"virtual:fanee",
			undefined,
			{ isEntry: false }
		);
		expect(resolved).toBe("virtual:fanee?fanee");
	});

	test("loads merged resources as a JS module", async () => {
		await createBundle(tempDir, {
			"manifest.json": { format: "otb", specVersion: "0.4.0" },
			"messages/en.json": { greeting: "Hello" },
			"modules/web/manifest.json": { format: "otb", specVersion: "0.4.0" },
			"modules/web/messages/en.json": { webKey: "web" },
		});

		const plugin = fanee({ bundlePath: tempDir });
		const source = await (plugin.load as LoadHook).call(undefined, "virtual:fanee?fanee");
		expect(typeof source).toBe("string");
		expect(source).toContain('"greeting":"Hello"');
		expect(source).toContain('"webKey":"web"');
	});

	test("supports custom virtual module id", async () => {
		await createBundle(tempDir, {
			"manifest.json": { format: "otb", specVersion: "0.4.0" },
			"messages/en.json": {},
		});

		const plugin = fanee({ bundlePath: tempDir, virtualId: "virtual:translations" });
		const resolved = await (plugin.resolveId as ResolveIdHook).call(
			undefined,
			"virtual:translations",
			undefined,
			{ isEntry: false }
		);
		expect(resolved).toBe("virtual:translations?fanee");
	});
});
