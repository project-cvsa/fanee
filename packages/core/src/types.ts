/** A BCP 47 language tag, e.g. `"en"`, `"zh-CN"`. */
export type Locale = string;
/** A named scope for grouping translations, e.g. `"common"`, `"errors"`. */
export type Namespace = string;
/** A key that identifies a specific message within a locale. */
export type MessageKey = string;
/**
 * How a message string is formatted after variable interpolation.
 * - `"mf2"` – MessageFormat 2.0
 * - `"mf1"` – MessageFormat (legacy)
 * - `"identity"` – simple string replacement
 * - Custom string – a user-provided formatter name.
 */
export type MessageFormattingMode = "mf2" | "mf1" | "identity" | (string & {});

/** A flat map of message keys to their translated strings for a single locale. */
export type LocaleMessages = Record<MessageKey, string>;

/** Messages for all locales within a single namespace. */
export type NamespaceResources = Record<Locale, LocaleMessages>;

/** The complete resource tree: namespace → locale → messages. */
export type BundleResources = Record<Namespace, NamespaceResources>;

/** Options passed to the low-level translate function. */
export interface TranslateOptions {
	/** Target locale for the translation. */
	locale: string;
	/** Variable bag for message interpolation. */
	vars?: Record<string, unknown>;
	/** Override the default formatting mode for this call. */
	formatting?: MessageFormattingMode;
}

/** Scoping hints used when obtaining a bound {@link TranslateFunction}. */
export interface TranslateContext {
	/** Override the active namespace. */
	namespace?: Namespace;
	/** Override the active locale. */
	locale?: Locale;
}

/** A pre-bound translate function tied to a specific locale and namespace. */
export type TranslateFunction = (
	key: MessageKey,
	vars?: Record<string, unknown>
) => string;

/** A map of locale → translated string, typically the result of {@link runtime.FaneeRuntime.tAll | tAll}. */
export type TranslationsByLocale = Record<Locale, string>;

/** Metadata descriptor for an OTB (Open Translation Bundle) package. */
export interface OTBManifest {
	/** Must be `"otb"`. */
	format: "otb";
	/** The spec version the bundle conforms to. */
	specVersion: string;
	/** Version of this particular bundle. */
	bundleVersion?: string;
	/** Whether the bundle contains all its dependencies inline. */
	standalone?: boolean;
	/** The locale the source messages are authored in. */
	sourceLocale?: string;
	/** Locales that this bundle provides translations for. */
	targetLocales?: Locale[];
	/** Human-readable name for the bundle. */
	name?: string;
	/** Default formatting mode for messages in this bundle. */
	formatting?: MessageFormattingMode;
	/** Extension keys (must be prefixed with `x-`). */
	[key: `x-${string}`]: unknown;
}

/** Mutable state container consumed by plugins and the runtime. */
export interface FaneeState {
	/** The full translation resource tree. */
	resources: BundleResources;
	/** Fallback locale when a key is missing in the current locale. */
	defaultLocale: Locale;
	/** The currently active locale. */
	currentLocale: Locale;
	/** The default namespace used for unqualified lookups. */
	baseNamespace: Namespace;
	/** The active message formatting mode. */
	formatting: MessageFormattingMode;
	/** Low-level translate function (locale-aware, may be swapped by plugins). */
	translate: (msg: string, options?: TranslateOptions) => string;
}
