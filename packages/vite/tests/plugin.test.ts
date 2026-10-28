import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import type { HmrContext, ModuleNode, ResolvedConfig, ViteDevServer } from "vite";
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
		expect(resolved).toBe("virtual:fanee");
	});

	test("loads merged resources as a JS module", async () => {
		await createBundle(tempDir, {
			"manifest.json": { format: "otb", specVersion: "0.4.0" },
			"messages/en.json": { greeting: "Hello" },
			"modules/web/manifest.json": { format: "otb", specVersion: "0.4.0" },
			"modules/web/messages/en.json": { webKey: "web" },
		});

		const plugin = fanee({ bundlePath: tempDir });
		const source = await (plugin.load as LoadHook).call(undefined, "virtual:fanee");
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
		expect(resolved).toBe("virtual:translations");
	});

	test("adds bundle directory to watcher in configureServer", () => {
		const plugin = fanee({ bundlePath: tempDir });
		const watched: string[] = [];
		const fakeServer = {
			watcher: {
				add(path: string) {
					watched.push(path);
				},
			},
		} as unknown as ViteDevServer;

		if (typeof plugin.configureServer === "function") {
			plugin.configureServer.call(undefined as never, fakeServer);
		}
		expect(watched).toContain(resolve(tempDir));
	});

	test("resolves relative bundlePath from config.root in configResolved", () => {
		const plugin = fanee({ bundlePath: "./relative-bundle" });
		const fakeConfig = {
			root: "/test/project/root",
		};

		if (typeof plugin.configResolved === "function") {
			plugin.configResolved.call(undefined as never, fakeConfig as unknown as ResolvedConfig);
		}

		const watched: string[] = [];
		const fakeServer = {
			watcher: {
				add(path: string) {
					watched.push(path);
				},
			},
		} as unknown as ViteDevServer;

		if (typeof plugin.configureServer === "function") {
			plugin.configureServer.call(undefined as never, fakeServer);
		}
		expect(watched).toContain(resolve("/test/project/root", "./relative-bundle"));
	});

	test("handles hot update: invalidates modules and sends full-reload", async () => {
		const plugin = fanee({ bundlePath: tempDir });
		const fakeModule: ModuleNode = {
			id: "virtual:fanee",
			url: "virtual:fanee",
		} as unknown as ModuleNode;

		let invalidated = false;
		let reloaded = false;

		const fakeServer = {
			moduleGraph: {
				getModuleById(id: string) {
					return id === "virtual:fanee" ? fakeModule : undefined;
				},
				idToModuleMap: new Map([["virtual:fanee", fakeModule]]),
				invalidateModule(mod: ModuleNode) {
					if (mod === fakeModule) invalidated = true;
				},
			},
			ws: {
				send(payload: { type: string; path: string }) {
					if (payload.type === "full-reload") reloaded = true;
				},
			},
		} as unknown as ViteDevServer;

		// 1. Unrelated file should do nothing
		if (typeof plugin.handleHotUpdate === "function") {
			const res = await plugin.handleHotUpdate.call(
				undefined as never,
				{
					file: "/outside/unrelated.json",
					server: fakeServer,
				} as unknown as HmrContext
			);
			expect(res).toBeUndefined();
			expect(invalidated).toBe(false);
			expect(reloaded).toBe(false);
		}

		// 2. File in bundlePath triggers invalidation and full reload
		if (typeof plugin.handleHotUpdate === "function") {
			const res = await plugin.handleHotUpdate.call(
				undefined as never,
				{
					file: join(tempDir, "messages/en.json"),
					server: fakeServer,
				} as unknown as HmrContext
			);
			expect(res).toContain(fakeModule);
			expect(invalidated).toBe(true);
			expect(reloaded).toBe(true);
		}
	});
});
