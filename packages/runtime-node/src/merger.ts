import { join } from "node:path";
import type { ModuleInfo, ResourceData } from "./types";
import { loadMessagesDir } from "./scanner";

export async function mergeResourcesForNamespace(
	namespace: string,
	bundlePath: string,
	modules: Map<string, ModuleInfo>,
): Promise<ResourceData> {
	const parts = namespace.split(":");

	let hitStandalone = false;
	const merged: ResourceData = {};

	const rootMessagesDir = join(bundlePath, "messages");
	await loadMessagesDir(rootMessagesDir, merged, new Set());

	for (const part of parts) {
		const segmentNamespace = parts.slice(0, parts.indexOf(part) + 1).join(":");
		const mod = modules.get(segmentNamespace);

		if (mod) {
			if (mod.standalone) {
				hitStandalone = true;
			}

			if (!hitStandalone) {
				const messagesDir = join(mod.path, "messages");
				await loadMessagesDir(messagesDir, merged, new Set());
			}
		}
	}

	const targetModule = modules.get(namespace);
	if (targetModule?.standalone) {
		const newMerged: ResourceData = {};
		const messagesDir = join(targetModule.path, "messages");
		await loadMessagesDir(messagesDir, newMerged, new Set());
		return newMerged;
	}

	return merged;
}
