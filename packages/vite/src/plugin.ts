import type { Plugin } from "vite";
import { resolve, relative } from "node:path";
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
	const bundlePath = resolve(options.bundlePath);

	async function generateModule(namespace: string): Promise<string> {
		const resources = await scanBundle(bundlePath);
		if (!namespace) {
			return `export const resources = ${JSON.stringify(resources)};\n`;
		}
		return `export const resources = ${JSON.stringify({
			[namespace]: resources[namespace]
		})};\n`;
	}

	return {
		name: "fanee",
		resolveId(source) {
			if (source.startsWith(`virtual:fanee`)) {
				return source;
			}
			return null;
		},
		load(id) {
			if (!id.startsWith(virtualId)) {
				return null;
			}

			// "virtual:fanee/namespace" -> "namespace"
			const importPath = id.slice(virtualId.length + 1);
			return generateModule(importPath);
		},
		async handleHotUpdate({ file, server }) {
			const rel = relative(bundlePath, file);
			if (rel.startsWith("..") || rel.startsWith("node_modules")) {
				return;
			}

			const moduleNode = server.moduleGraph.getModuleById(virtualId);
			if (moduleNode) {
				return [moduleNode];
			}
		},
	};
}
