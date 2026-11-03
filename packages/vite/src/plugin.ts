import type { Plugin } from "vite";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { scanBundle } from "@fanee/fs-scanner";

export interface FaneePluginOptions {
	/** Path to the OTB bundle directory. */
	bundlePath: string;
	/** Virtual module ID used for importing resources. Defaults to `"virtual:fanee"`. */
	virtualId?: string;
}

export function fanee(options: FaneePluginOptions): Plugin {
	const virtualId = options.virtualId ?? "virtual:fanee";
	const resolvedPrefix = "\0";
	let bundlePath = resolve(options.bundlePath);

	function matchesVirtualId(id: string): boolean {
		return id === virtualId || id.startsWith(`${virtualId}/`);
	}

	function isBundleFile(file: string): boolean {
		const rel = relative(bundlePath, file);
		return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
	}

	function isResourceModule(id: string | null): boolean {
		return id?.startsWith(resolvedPrefix) === true && matchesVirtualId(id.slice(1));
	}

	return {
		name: "fanee",
		configResolved(config) {
			bundlePath = resolve(config.root, options.bundlePath);
		},
		configureServer(server) {
			server.watcher.add(bundlePath);
			if (!Reflect.has(server, "environments")) {
				const reload = (file: string) => {
					if (!isBundleFile(file)) return;
					for (const mod of server.moduleGraph.idToModuleMap.values()) {
						if (isResourceModule(mod.id)) server.moduleGraph.invalidateModule(mod);
					}
					server.ws.send({ type: "full-reload", path: "*" });
				};
				server.watcher.on("add", reload);
				server.watcher.on("unlink", reload);
			}
		},
		resolveId(source) {
			return matchesVirtualId(source) ? `${resolvedPrefix}${source}` : null;
		},
		async load(id) {
			if (!isResourceModule(id)) return null;
			const resources = await scanBundle(bundlePath);
			const source = id.slice(1);
			if (source === virtualId) {
				return `export const resources = ${JSON.stringify(resources)};\n`;
			}
			const namespace = source.slice(virtualId.length + 1);
			if (!resources[namespace]) {
				this.error(`[fanee] Unknown namespace: ${namespace}`);
			}
			return `export const resources = ${JSON.stringify({ [namespace]: resources[namespace] })};\n`;
		},
		hotUpdate({ file }) {
			if (!isBundleFile(file)) return;
			return [...this.environment.moduleGraph.idToModuleMap.values()].filter((mod) =>
				isResourceModule(mod.id)
			);
		},
		handleHotUpdate({ file, server }) {
			if (!isBundleFile(file)) return;
			return [...server.moduleGraph.idToModuleMap.values()].filter((mod) =>
				isResourceModule(mod.id)
			);
		},
	};
}
