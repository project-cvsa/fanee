export type Locale = string;
export type Namespace = string;
export type MessageKey = string;
export type MessageFormattingMode = "mf2" | "mf1" | "identity" | (string & {});

export type LocaleMessages = Record<MessageKey, string>;

export type NamespaceResources = Record<Locale, LocaleMessages>;

export type BundleResources = Record<Namespace, NamespaceResources>;

export interface TranslateOptions {
	locale: string;
	vars?: Record<string, unknown>;
	formatting?: MessageFormattingMode;
}

export interface TranslateContext {
	namespace?: Namespace;
	locale?: Locale;
}

export type TranslateFunction = (
	key: MessageKey,
	vars?: Record<string, unknown>
) => string;

export type TranslationsByLocale = Record<Locale, string>;

export interface OTBManifest {
	format: "otb";
	specVersion: string;
	bundleVersion?: string;
	standalone?: boolean;
	sourceLocale?: string;
	targetLocales?: Locale[];
	name?: string;
	formatting?: MessageFormattingMode;
	[key: `x-${string}`]: unknown;
}

export interface FaneeState {
	resources: BundleResources;
	defaultLocale: Locale;
	currentLocale: Locale;
	baseNamespace: Namespace;
	formatting: MessageFormattingMode;
	translate: (msg: string, options?: TranslateOptions) => string;
}
