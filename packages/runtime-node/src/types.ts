export interface OTBManifest {
	format: "otb";
	specVersion: string;
	bundleVersion?: string;
	standalone?: boolean;
	sourceLocale?: string;
	targetLocales?: string[];
	name?: string;
	[key: `x-${string}`]: unknown;
}

export interface ResourceFile {
	[key: string]: string;
}

export interface RuntimeConfig {
	defaultLocale?: string;
}

export interface ResolutionContext {
	namespace: string;
	locale?: string;
}

export type TranslationFunction = (key: string, vars?: Record<string, unknown>) => string;

export interface Runtime {
	setContext(context: ResolutionContext): void;
	getContext(): ResolutionContext;
	t(locale?: string): TranslationFunction;
	setLocale(locale: string): void;
	getLocales(): string[];
}

export interface ModuleInfo {
	path: string;
	namespace: string;
	manifest: OTBManifest;
	standalone: boolean;
}

export type ResourceData = Record<string, Record<string, string>>;
