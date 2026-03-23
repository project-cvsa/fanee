import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { OTBManifest, ModuleInfo } from "./types";

export async function scanModules(
	modulesDir: string,
	parentNamespace: string,
	modules: Map<string, ModuleInfo>,
): Promise<void> {
	let entries: string[];
	try {
		entries = await readdir(modulesDir);
	} catch {
		return;
	}

	for (const entry of entries) {
		const fullPath = join(modulesDir, entry);
		const entryStat = await stat(fullPath);

		if (!entryStat.isDirectory()) continue;

		const manifestPath = join(fullPath, "manifest.json");
		let manifest: OTBManifest | null = null;

		try {
			const content = await readFile(manifestPath, "utf-8");
			manifest = JSON.parse(content) as OTBManifest;
		} catch {
			// No manifest in this directory, but recurse to find nested modules
			await scanModules(fullPath, parentNamespace, modules);
			continue;
		}

		const namespace = parentNamespace ? `${parentNamespace}:${entry}` : entry;

		modules.set(namespace, {
			path: fullPath,
			namespace,
			manifest,
			standalone: manifest.standalone ?? false,
		});

		await scanModules(fullPath, namespace, modules);
	}
}

export async function loadManifest(bundlePath: string): Promise<OTBManifest> {
	const rootManifestPath = join(bundlePath, "manifest.json");
	const rootManifestContent = await readFile(rootManifestPath, "utf-8");
	const rootManifest = JSON.parse(rootManifestContent) as OTBManifest;

	if (rootManifest.format !== "otb") {
		throw new Error(`[server-unpack] Invalid bundle format: expected "otb", got "${rootManifest.format}"`);
	}

	return rootManifest;
}

export async function loadMessagesDir(
	dir: string,
	target: Record<string, Record<string, string>>,
	availableLocales: Set<string>,
): Promise<void> {
	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		return;
	}

	for (const entry of entries) {
		if (!entry.endsWith(".json")) continue;

		const locale = entry.replace(/\.json$/, "");
		const filePath = join(dir, entry);

		const content = await readFile(filePath, "utf-8");
		const data = JSON.parse(content) as Record<string, string>;

		target[locale] = {
			...target[locale],
			...data
		};

		availableLocales.add(locale);
	}
}
