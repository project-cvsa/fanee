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
	const resolvedId = `${virtualId}?fanee`;
	const bundlePath = resolve(options.bundlePath);

	async function generateModule(): Promise<string> {
		const resources = await scanBundle(bundlePath);
		return `export const resources = ${JSON.stringify(resources)};\n`;
	}

	return {
		name: "fanee",
		resolveId(id) {
			if (id === virtualId) {
				return resolvedId;
			}
			return null;
		},
		async load(id) {
			if (id !== resolvedId) {
				return null;
			}
			return generateModule();
		},
		async handleHotUpdate({ file, server }) {
			const rel = relative(bundlePath, file);
			if (rel.startsWith("..") || rel.startsWith("node_modules")) {
				return;
			}

			const moduleNode = server.moduleGraph.getModuleById(resolvedId);
			if (moduleNode) {
				return [moduleNode];
			}
		},
	};
}
