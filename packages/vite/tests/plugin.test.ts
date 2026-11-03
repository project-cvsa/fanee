import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	createServer,
	isRunnableDevEnvironment,
	type HMRPayload,
	type Plugin,
	type ViteDevServer,
} from "vite";
import type { BundleResources } from "@fanee/core";
import { fanee } from "@/index";

describe("fanee Vite integration", () => {
	let root: string;
	let server: ViteDevServer | undefined;
	let socket: WebSocket | undefined;

	beforeEach(async () => {
		root = await realpath(await mkdtemp(join(tmpdir(), "fanee-vite-")));
		await write("bundle/manifest.json", { format: "otb", specVersion: "0.4.0" });
		await write("bundle/messages/en.json", { greeting: "Hello" });
		await write("entry.js", 'export { resources } from "virtual:fanee";');
	});

	afterEach(async () => {
		socket?.close();
		await server?.close();
		server = undefined;
		socket = undefined;
		await rm(root, { recursive: true, force: true });
	});

	async function write(file: string, value: string | object) {
		const target = join(root, file);
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, typeof value === "string" ? value : JSON.stringify(value));
	}

	async function start(virtualId = "virtual:fanee", bundlePath = "./bundle", projectRoot = root) {
		let ready: Promise<void> = Promise.resolve();
		const watcherReady: Plugin = {
			name: "test-watcher-ready",
			configureServer(vite) {
				const resourceFile = join(root, "bundle/messages/en.json");
				ready = new Promise((resolve) => {
					const added = (file: string) => {
						if (file !== resourceFile) return;
						vite.watcher.off("add", added);
						resolve();
					};
					vite.watcher.on("add", added);
					if (vite.watcher.getWatched()[dirname(resourceFile)]?.includes("en.json"))
						added(resourceFile);
				});
			},
		};
		server = await createServer({
			root: projectRoot,
			configFile: false,
			logLevel: "silent",
			plugins: [watcherReady, fanee({ bundlePath, virtualId })],
			server: { host: "127.0.0.1", port: 0, watch: { ignoreInitial: false } },
			optimizeDeps: { noDiscovery: true, include: [] },
		});
		await server.listen();
		await ready;
		const address = server.httpServer?.address();
		if (!address || typeof address === "string") throw new Error("Missing Vite address");
		const connected = new Promise<void>((resolve, reject) => {
			socket = new WebSocket(
				`ws://127.0.0.1:${address.port}/?token=${server?.config.webSocketToken}`,
				"vite-hmr"
			);
			socket.addEventListener("error", () => reject(new Error("Vite WebSocket failed")));
			socket.addEventListener("message", () => resolve(), { once: true });
		});
		await connected;
		return server;
	}

	function nextReload(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!socket) return reject(new Error("Missing WebSocket"));
			const client = socket;
			const receive = (event: MessageEvent) => {
				const payload: unknown = JSON.parse(String(event.data));
				if (typeof payload !== "object" || payload === null || !("type" in payload)) return;
				if (payload.type === "error") reject(new Error(JSON.stringify(payload)));
				if (payload.type === "full-reload") {
					client.removeEventListener("message", receive);
					resolve();
				}
			};
			client.addEventListener("message", receive);
		});
	}

	async function readServerResources(vite: ViteDevServer): Promise<BundleResources> {
		const environment = vite.environments.ssr;
		if (!environment || !isRunnableDevEnvironment(environment)) {
			throw new Error("Missing SSR runner");
		}
		const module = await environment.runner.import<{ resources: BundleResources }>(
			join(root, "entry.js")
		);
		return module.resources;
	}

	test("loads resources through real client and SSR module pipelines", async () => {
		const vite = await start();
		const client = await vite.transformRequest("/entry.js");
		expect(client?.code).toContain("virtual:fanee");
		expect((await readServerResources(vite))[""]?.en?.greeting).toBe("Hello");
	});

	test("reloads a CSR entry after an existing message changes", async () => {
		const vite = await start();
		await vite.transformRequest("/entry.js");
		const reload = nextReload();
		await write("bundle/messages/en.json", { greeting: "Updated" });
		await reload;
		const module = await vite.transformRequest("virtual:fanee");
		expect(module?.code).toContain('"greeting":"Updated"');
	});

	test("updates an SSR-only import before the next render", async () => {
		const vite = await start();
		expect((await readServerResources(vite))[""]?.en?.greeting).toBe("Hello");
		const environment = vite.environments.ssr;
		if (!environment) throw new Error("Missing SSR environment");
		const updated = new Promise<void>((resolve) => {
			const send = environment.hot.send.bind(environment.hot);
			environment.hot.send = (payload: HMRPayload) => {
				send(payload);
				if (payload.type === "full-reload") resolve();
			};
		});
		await write("bundle/messages/en.json", { greeting: "Updated" });
		await updated;
		expect((await readServerResources(vite))[""]?.en?.greeting).toBe("Updated");
	});

	test("adds and removes locale resources while the client entry stays loaded", async () => {
		const vite = await start();
		await vite.transformRequest("/entry.js");
		let reload = nextReload();
		await write("bundle/messages/fr.json", { greeting: "Bonjour" });
		await reload;
		expect((await readServerResources(vite))[""]?.fr?.greeting).toBe("Bonjour");
		await vite.transformRequest("/entry.js");
		reload = nextReload();
		await rm(join(root, "bundle/messages/fr.json"));
		await reload;
		expect((await readServerResources(vite))[""]?.fr).toBeUndefined();
	});

	test("loads an exact nested namespace through a custom virtual ID", async () => {
		await write("bundle/modules/shop/manifest.json", { format: "otb", specVersion: "0.4.0" });
		await write("bundle/modules/shop/messages/en.json", { title: "Shop" });
		await write("entry.js", 'export { resources } from "virtual:messages/shop";');
		const vite = await start("virtual:messages");
		expect(await readServerResources(vite)).toEqual({
			shop: { en: { greeting: "Hello", title: "Shop" } },
		});
	});

	test("reloads resources located outside the Vite project root", async () => {
		await write("app/entry.js", 'export { resources } from "virtual:fanee";');
		const vite = await start("virtual:fanee", "../bundle", join(root, "app"));
		await vite.transformRequest("/entry.js");
		const reload = nextReload();
		await write("bundle/messages/en.json", { greeting: "Outside root" });
		await reload;
		expect((await vite.transformRequest("virtual:fanee"))?.code).toContain("Outside root");
	});
});
