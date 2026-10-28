import type { EnvironmentModuleNode, ModuleNode, Plugin, ViteDevServer } from "vite";
import { isAbsolute, relative, resolve } from "node:path";
import { scanBundle } from "@fanee/fs-scanner";

export interface FaneePluginOptions {
	/** Path to the OTB bundle directory. */
	bundlePath: string;
	/** Virtual module ID used for importing resources. Defaults to `"virtual:fanee"`. */
	virtualId?: string;
}

const DEFAULT_VIRTUAL_ID = "virtual:fanee";

export function fanee(options: FaneePluginOptions): Plugin {
	const virtualId = options.virtualId ?? DEFAULT_VIRTUAL_ID;
	let bundlePath = resolve(options.bundlePath);
	const virtualModuleIds = new Set<string>();

	function matchesVirtualId(id: string): boolean {
		return id === virtualId || id.startsWith(`${virtualId}/`);
	}

	function isBundleFile(file: string): boolean {
		const rel = relative(bundlePath, file);
		return !rel.startsWith("..") && !rel.startsWith("node_modules") && !isAbsolute(rel);
	}

	async function generateModule(namespace: string): Promise<string> {
		const resources = await scanBundle(bundlePath);
		if (!namespace) {
			return `export const resources = ${JSON.stringify(resources)};\n`;
		}
		return `export const resources = ${JSON.stringify({
			[namespace]: resources[namespace],
		})};\n`;
	}

	function invalidateAllMatchingModules(server: ViteDevServer): ModuleNode[] {
		const invalidated = new Set<ModuleNode>();

		if (server.moduleGraph) {
			for (const id of virtualModuleIds) {
				const mod = server.moduleGraph.getModuleById(id);
				if (mod) {
					server.moduleGraph.invalidateModule(mod);
					invalidated.add(mod);
				}
			}
			if (server.moduleGraph.idToModuleMap) {
				for (const [id, mod] of server.moduleGraph.idToModuleMap.entries()) {
					if (matchesVirtualId(id)) {
						server.moduleGraph.invalidateModule(mod);
						invalidated.add(mod);
					}
				}
			}
		}

		const environments = (
			server as unknown as {
				environments?: Record<
					string,
					{
						moduleGraph?: {
							getModuleById: (id: string) => ModuleNode | undefined;
							idToModuleMap?: Map<string, ModuleNode>;
							invalidateModule: (mod: ModuleNode) => void;
						};
					}
				>;
			}
		).environments;

		if (environments) {
			for (const env of Object.values(environments)) {
				const mg = env.moduleGraph;
				if (!mg) continue;
				for (const id of virtualModuleIds) {
					const mod = mg.getModuleById(id);
					if (mod) {
						mg.invalidateModule(mod);
						invalidated.add(mod);
					}
				}
				if (mg.idToModuleMap) {
					for (const [id, mod] of mg.idToModuleMap.entries()) {
						if (matchesVirtualId(id)) {
							mg.invalidateModule(mod);
							invalidated.add(mod);
						}
					}
				}
			}
		}

		return Array.from(invalidated);
	}

	function notifyClientReload(server: ViteDevServer) {
		const hotChannel =
			(
				server as unknown as {
					hot?: { send: (payload: { type: string; path: string }) => void };
				}
			).hot ?? server.ws;
		hotChannel?.send({
			type: "full-reload",
			path: "*",
		});
	}

	return {
		name: "fanee",
		configResolved(config) {
			if (!isAbsolute(options.bundlePath)) {
				bundlePath = resolve(config.root, options.bundlePath);
			} else {
				bundlePath = options.bundlePath;
			}
		},
		configureServer(server) {
			server.watcher.add(bundlePath);
		},
		resolveId(source) {
			if (matchesVirtualId(source)) {
				virtualModuleIds.add(source);
				return source;
			}
			return null;
		},
		async load(id) {
			if (!matchesVirtualId(id)) {
				return null;
			}

			virtualModuleIds.add(id);
			this?.addWatchFile?.(bundlePath);

			// "virtual:fanee/namespace" -> "namespace"
			const importPath = id === virtualId ? "" : id.slice(virtualId.length + 1);
			return generateModule(importPath);
		},
		async hotUpdate(options) {
			if (!isBundleFile(options.file)) {
				return;
			}

			invalidateAllMatchingModules(options.server);
			notifyClientReload(options.server);

			const envMods: EnvironmentModuleNode[] = [];
			for (const id of virtualModuleIds) {
				const mod = this.environment.moduleGraph.getModuleById(id);
				if (mod) envMods.push(mod);
			}
			if (this.environment.moduleGraph.idToModuleMap) {
				for (const [id, mod] of this.environment.moduleGraph.idToModuleMap.entries()) {
					if (matchesVirtualId(id) && !envMods.includes(mod)) {
						envMods.push(mod);
					}
				}
			}
			return envMods;
		},
		async handleHotUpdate({ file, server }) {
			if (!isBundleFile(file)) {
				return;
			}

			const mods = invalidateAllMatchingModules(server);
			notifyClientReload(server);
			return mods;
		},
	};
}
