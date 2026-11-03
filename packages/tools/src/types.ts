import type { BundleResources } from "@fanee/core";

export interface TranslationFactory {
	name: string;
	baseNamespace?: string;
	argument?: "context" | "namespace";
}

export interface SourceProject {
	include: string[];
	factories?: TranslationFactory[];
	functions?: Record<string, string>;
	namespace?: string;
	transform?: (source: string, file: string) => string | Promise<string>;
}

export interface ToolsConfig {
	bundlePath: string;
	sourceLocale?: string;
	missingTranslations?: "warning" | "error";
	sources: SourceProject[];
}

export interface Diagnostic {
	file: string;
	line?: number;
	code:
		| "invalid-resource"
		| "invalid-message"
		| "duplicate-key"
		| "missing-key"
		| "missing-translation"
		| "missing-locale"
		| "variables"
		| "dynamic-namespace"
		| "dynamic-key";
	message: string;
	severity: "error" | "warning";
}

export interface ResourceEntry {
	file: string;
	namespace: string;
	locale: string;
	key: string;
	message: string;
	variables: string[];
}

export interface KeyReference {
	file: string;
	line?: number;
	namespace: string;
	pattern: string;
	variables?: string[];
}

export interface Analysis {
	resources: BundleResources;
	entries: ResourceEntry[];
	references: KeyReference[];
	diagnostics: Diagnostic[];
	unused: ResourceEntry[];
}
