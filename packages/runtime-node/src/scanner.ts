import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { OTBManifest, LocaleMessages } from "./types";

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
