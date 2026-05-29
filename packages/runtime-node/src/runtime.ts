import { join } from "node:path";
import { readdir, stat, readFile } from "node:fs/promises";
import type {
	Locale,
	Namespace,
	MessageKey,
	TranslateContext,
	TranslateFunction,
	TranslationsByLocale,
	BundleResources,
	FaneeConfig,
	NamespaceResources,
} from "./types";
import { loadManifest, loadMessagesDir } from "./scanner";
import { createTranslationFunction } from "./translator";

class FaneeRuntime {
	private readonly bundlePath: string;
	private readonly defaultLocale: Locale;
	private readonly baseNamespace: Namespace;
	private readonly modules: Map<Namespace, { path: string; standalone: boolean }>;
	private readonly resources: BundleResources;
	private locale: Locale;

	constructor(config: FaneeConfig) {
		this.bundlePath = config.bundlePath;
		this.defaultLocale = config.defaultLocale;
		this.baseNamespace = config.namespace ?? "";
		this.modules = new Map();
		this.resources = {};
		this.locale = config.defaultLocale;
	}

	async load(): Promise<void> {
		const rootManifest = await loadManifest(this.bundlePath);

		this.modules.set("", {
			path: this.bundlePath,
			standalone: rootManifest.standalone ?? false,
		});

		const modulesDir = join(this.bundlePath, "modules");
		await this.scanModules(modulesDir, "");

		await this.loadAllResources();
	}

	getAllTranslations() {
		return this.resources;
	}

	getTranslationsForNamespace(ns: Namespace): NamespaceResources | undefined {
		return this.resources[ns];
	}

	private async scanModules(modulesDir: string, parentNamespace: Namespace): Promise<void> {
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
				await this.scanModules(fullPath, parentNamespace);
				continue;
			}

			const namespace: Namespace = parentNamespace
				? (`${parentNamespace}:${entry}` as Namespace)
				: (entry as Namespace);

			this.modules.set(namespace, {
				path: fullPath,
				standalone: manifest?.standalone ?? false,
			});

			await this.scanModules(fullPath, namespace);
		}
	}

	private async loadAllResources(): Promise<void> {
		const rootMessagesDir = join(this.bundlePath, "messages");
		this.resources[""] = {};
		await loadMessagesDir(rootMessagesDir, this.resources[""]);

		for (const [namespace, mod] of this.modules) {
			if (namespace === "") continue;

			const parts = namespace.split(":");
			let hitStandalone = false;
			const merged: Record<string, Record<string, string>> = {};

			await loadMessagesDir(rootMessagesDir, merged);

			for (const part of parts) {
				const segmentNs = parts.slice(0, parts.indexOf(part) + 1).join(":") as Namespace;
				const modInfo = this.modules.get(segmentNs);

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
				this.resources[namespace] = newMerged;
			} else {
				this.resources[namespace] = merged;
			}
		}
	}

	t(context?: Partial<TranslateContext>): TranslateFunction {
		const locale = context?.locale ?? this.locale;

		const ns =
			context?.namespace !== undefined
				? this.baseNamespace
					? `${this.baseNamespace}:${context.namespace}`
					: context.namespace
				: this.baseNamespace;

		const resources = this.resources[ns];
		if (!resources) {
			return (k: MessageKey) => k;
		}

		return createTranslationFunction(resources, locale, this.defaultLocale);
	}

	tAll(key: MessageKey, vars?: Record<string, unknown>): TranslationsByLocale {
		const resources = this.resources[this.baseNamespace];
		const result: TranslationsByLocale = {};

		if (!resources) {
			return result;
		}

		const locales = Object.keys(resources);
		for (const loc of locales) {
			const t = createTranslationFunction(resources, loc as Locale, this.defaultLocale);
			result[loc as Locale] = t(key, vars);
		}

		return result;
	}

	getLocales(): Locale[] {
		const locales = new Set<Locale>();
		for (const resource of Object.values(this.resources)) {
			for (const locale of Object.keys(resource)) {
				locales.add(locale as Locale);
			}
		}
		return Array.from(locales).sort();
	}
}

export { FaneeRuntime };
