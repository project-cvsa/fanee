import { join } from "node:path";
import type {
	Runtime,
	RuntimeConfig,
	ResolutionContext,
	ModuleInfo,
	ResourceData,
	TranslationFunction,
} from "./types";
import { loadManifest, scanModules } from "./scanner";
import { mergeResourcesForNamespace } from "./merger";
import { createTranslationFunction } from "./translator";

export async function createRuntime(bundlePath: string, config?: RuntimeConfig): Promise<Runtime> {
	const state = {
		bundlePath,
		config: config ?? {},
		currentContext: {
			namespace: "",
			locale: config?.defaultLocale ?? "en",
		} as ResolutionContext,
		modules: new Map<string, ModuleInfo>(),
		resourceData: new Map<string, ResourceData>(),
	};

	async function loadResourcesForNamespace(namespace: string): Promise<void> {
		if (state.resourceData.has(namespace)) return;

		const merged = await mergeResourcesForNamespace(
			namespace,
			bundlePath,
			state.modules,
		);
		state.resourceData.set(namespace, merged);
	}

	async function initialize(): Promise<void> {
		const rootManifest = await loadManifest(bundlePath);

		state.modules.set("", {
			path: bundlePath,
			namespace: "",
			manifest: rootManifest,
			standalone: rootManifest.standalone ?? false,
		});

		const modulesDir = join(bundlePath, "modules");
		await scanModules(modulesDir, "", state.modules);

		for (const namespace of state.modules.keys()) {
			await loadResourcesForNamespace(namespace);
		}
	}

	function setContext(context: ResolutionContext): void {
		state.currentContext = {
			namespace: context.namespace,
			locale: context.locale ?? state.config.defaultLocale ?? "en",
		};
	}

	function getContext(): ResolutionContext {
		return { ...state.currentContext };
	}

	function t(locale?: string): TranslationFunction {
		const resources = state.resourceData.get(state.currentContext.namespace);
		if (locale) state.currentContext.locale = locale;
		return createTranslationFunction(resources, state.currentContext, state.config);
	}

	function setLocale(locale: string): void {
		state.currentContext.locale = locale;
	}

	function getLocales(): string[] {
		const allLocales = new Set<string>();
		for (const resources of state.resourceData.values()) {
			for (const locale of Object.keys(resources)) {
				allLocales.add(locale);
			}
		}

		return Array.from(allLocales).sort();
	}

	await initialize();

	return {
		setContext,
		getContext,
		t,
		setLocale,
		getLocales,
	};
}
