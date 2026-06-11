import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type {
	OTBManifest,
	LocaleMessages,
	Namespace,
	BundleResources,
} from "@fanee/core";

export async function loadManifest(bundlePath: string): Promise<OTBManifest> {
	const rootManifestPath = join(bundlePath, "manifest.json");
	const rootManifestContent = await readFile(rootManifestPath, "utf-8");
	const rootManifest = JSON.parse(rootManifestContent) as OTBManifest;

	if (rootManifest.format !== "otb") {
		throw new Error(
			`[fanee] Invalid bundle format: expected "otb", got "${rootManifest.format}"`
		);
	}

	return rootManifest;
}

export async function loadMessagesDir(
	dir: string,
	target: Record<string, LocaleMessages>
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
		const data = JSON.parse(content) as LocaleMessages;

		target[locale] = {
			...(target[locale] ?? {}),
			...data,
		};
	}
}

type ModuleInfo = { path: string; standalone: boolean };

async function collectModules(
	modulesDir: string,
	parentNamespace: Namespace,
	modules: Map<Namespace, ModuleInfo>
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
		let manifest: { standalone?: boolean } | null = null;

		try {
			const content = await readFile(manifestPath, "utf-8");
			manifest = JSON.parse(content);
		} catch {
			await collectModules(fullPath, parentNamespace, modules);
			continue;
		}

		const namespace: Namespace = parentNamespace
			? (`${parentNamespace}:${entry}` as Namespace)
			: (entry as Namespace);

		modules.set(namespace, {
			path: fullPath,
			standalone: manifest?.standalone ?? false,
		});

		await collectModules(fullPath, namespace, modules);
	}
}

async function buildResources(
	bundlePath: string,
	modules: Map<Namespace, ModuleInfo>
): Promise<BundleResources> {
	const resources: BundleResources = {};
	const rootMessagesDir = join(bundlePath, "messages");

	resources[""] = {};
	await loadMessagesDir(rootMessagesDir, resources[""]);

	for (const [namespace, mod] of modules) {
		if (namespace === "") continue;

		const parts = namespace.split(":");
		let hitStandalone = false;
		const merged: Record<string, Record<string, string>> = {};

		await loadMessagesDir(rootMessagesDir, merged);

		for (const part of parts) {
			const segmentNs = parts
				.slice(0, parts.indexOf(part) + 1)
				.join(":") as Namespace;
			const modInfo = modules.get(segmentNs);

			if (modInfo) {
				if (modInfo.standalone) {
					hitStandalone = true;
				}
				if (!hitStandalone) {
					const messagesDir = join(modInfo.path, "messages");
					await loadMessagesDir(messagesDir, merged);
				}
			}
		}

		if (mod.standalone) {
			const newMerged: Record<string, Record<string, string>> = {};
			const messagesDir = join(mod.path, "messages");
			await loadMessagesDir(messagesDir, newMerged);
			resources[namespace] = newMerged;
		} else {
			resources[namespace] = merged;
		}
	}

	return resources;
}

export async function scanBundle(
	bundlePath: string
): Promise<BundleResources> {
	const rootManifest = await loadManifest(bundlePath);

	const modules = new Map<Namespace, ModuleInfo>();
	modules.set("", {
		path: bundlePath,
		standalone: rootManifest.standalone ?? false,
	});

	const modulesDir = join(bundlePath, "modules");
	await collectModules(modulesDir, "", modules);

	return buildResources(bundlePath, modules);
}
