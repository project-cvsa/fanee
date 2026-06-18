import { readFile, readdir, stat, type FileHandle, open, mkdtemp } from "node:fs/promises";
import path, { join, resolve } from "node:path";
import type { BundleResources, LocaleMessages, Namespace, OTBManifest } from "@fanee/core";
import AdmZip from 'adm-zip';
import { tmpdir } from "node:os";
import { rm } from "node:fs/promises";

export async function loadManifest(bundlePath: string): Promise<OTBManifest> {
	const content = await readFile(join(bundlePath, "manifest.json"), "utf-8");
	const manifest = JSON.parse(content) as OTBManifest;

	if (manifest.format !== "otb") {
		throw new Error(`[fanee] Invalid bundle format: expected "otb", got "${manifest.format}"`);
	}

	return manifest;
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
		const content = await readFile(join(dir, entry), "utf-8");
		const data = JSON.parse(content) as LocaleMessages;

		target[locale] = { ...(target[locale] ?? {}), ...data };
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
			manifest = JSON.parse(content) as { standalone?: boolean };
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
		const merged: Record<string, Record<string, string>> = {};
		await loadMessagesDir(rootMessagesDir, merged);

		let hitStandalone = false;
		for (let i = 0; i < parts.length; i++) {
			const segmentNs = parts.slice(0, i + 1).join(":") as Namespace;
			const modInfo = modules.get(segmentNs);
			if (!modInfo) continue;

			if (modInfo.standalone) {
				hitStandalone = true;
			}
			if (!hitStandalone) {
				await loadMessagesDir(join(modInfo.path, "messages"), merged);
			}
		}

		if (mod.standalone) {
			const standalone: Record<string, Record<string, string>> = {};
			await loadMessagesDir(join(mod.path, "messages"), standalone);
			resources[namespace] = standalone;
		} else {
			resources[namespace] = merged;
		}
	}

	return resources;
}

export async function isZipArchive(path: string) {
	let fileHandle: FileHandle | null = null;
	try {
		fileHandle = await open(path, 'r');
		const buffer = Buffer.alloc(4);
		await fileHandle.read(buffer, 0, 4, 0);
		return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
	} catch {
		return false;
	} finally {
		if (fileHandle) {
			await fileHandle.close();
		}
	}
}

export async function unarchiveZip(pathStr: string) {
	const tmpDir = await mkdtemp(path.join(tmpdir(), `zip-${performance.now()}`));
	const zip = new AdmZip(pathStr);
	zip.extractAllTo(tmpDir, true);
	return tmpDir;
}

/**
 * Scan an OTB bundle directory and produce merged BundleResources.
 *
 * Implements the OTB Bundle-phase merge algorithm independently:
 * descendant modules override ancestor modules, and `standalone: true`
 * modules do not inherit ancestor data.
 */
export async function scanBundle(bundlePath: string): Promise<BundleResources> {
	const resolvedPath = resolve(bundlePath);
	const isZip = await isZipArchive(bundlePath);

	const finalPath = isZip ? await unarchiveZip(resolvedPath) : resolvedPath

	await loadManifest(finalPath);

	const modules = new Map<Namespace, ModuleInfo>();
	modules.set("", {
		path: finalPath,
		standalone: false,
	});

	await collectModules(join(finalPath, "modules"), "", modules);
	const resources = await buildResources(finalPath, modules);
	if (isZip) {
		try { rm(finalPath, { recursive: true }); }
		finally { }
	}
	return resources;
}
