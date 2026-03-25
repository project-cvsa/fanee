export type Locale = string;
export type Namespace = string;
export type MessageKey = string;

export type LocaleMessages = Record<MessageKey, string>;

export type NamespaceResources = Record<Locale, LocaleMessages>;

export type BundleResources = Record<Namespace, NamespaceResources>;

export interface FaneeConfig {
	bundlePath: string;
	defaultLocale: Locale;
	namespace?: Namespace;
}

export interface TranslateContext {
	namespace?: Namespace;
	locale?: Locale;
}

export type TranslateFunction = (key: MessageKey, vars?: Record<string, unknown>) => string;

export type TranslationsByLocale = Record<Locale, string>;

export interface OTBManifest {
	format: "otb";
	specVersion: string;
	bundleVersion?: string;
	standalone?: boolean;
	sourceLocale?: string;
	targetLocales?: Locale[];
	name?: string;
	[key: `x-${string}`]: unknown;
}
