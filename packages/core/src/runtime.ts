import type {
	FaneeState,
	Locale,
	MessageKey,
	TranslateContext,
	TranslateFunction,
	TranslationsByLocale,
	NamespaceResources,
	BundleResources,
} from "./types";
import { defaultState } from "./state";

/** Sequenced runtime that processes plugin setup before translations are available. */
export class FaneeRuntime {
	private state: FaneeState;
	private queue: Promise<void>;
	private listeners: Set<(state: FaneeState) => void>;
	private version: number;

	constructor() {
		this.state = defaultState();
		this.queue = Promise.resolve();
		this.listeners = new Set();
		this.version = 0;
	}

	private notify() {
		this.version += 1;
		const s = this.state;
		for (const fn of this.listeners) {
			fn(s);
		}
	}

	/**
	 * Register a plugin function that transforms the runtime state.
	 *
	 * Plugins are executed sequentially (FIFO) in the order they are registered.
	 * Each plugin receives the current {@link FaneeState} and may return a new state
	 * (or a promise thereof). The entire chain must resolve before the runtime
	 * is considered "ready" (see {@link ready}).
	 *
	 * @param fn - A plugin function receiving the current state.
	 * @returns `this` for chaining.
	 *
	 * @example
	 * ```ts
	 * runtime.use((state) => ({ ...state, currentLocale: "zh-CN" }));
	 * ```
	 */
	use(fn: (state: FaneeState) => FaneeState | Promise<FaneeState>): this {
		this.queue = this.queue.then(async () => {
			this.state = await fn(this.state);
			this.notify();
		});
		return this;
	}

	/**
	 * Shallow-merge a partial state patch into the current state.
	 *
	 * This operation is queued and runs after all previously registered plugins.
	 * It is equivalent to a plugin that destructures the patch over the state.
	 *
	 * @param patch - A partial {@link FaneeState} whose properties override the current state.
	 * @returns `this` for chaining.
	 *
	 * @example
	 * ```ts
	 * runtime.config({ defaultLocale: "en", formatting: "mf2" });
	 * ```
	 */
	config(patch: Partial<FaneeState>): this {
		this.queue = this.queue.then(async () => {
			this.state = { ...this.state, ...patch };
			this.notify();
		});
		return this;
	}

	/**
	 * @internal
	 * Makes the runtime thenable so callers can `await` plugin setup before
	 * calling translation methods.
	 *
	 * @param onfulfilled - Handler for successful queue resolution.
	 * @param onrejected  - Handler for queue rejection.
	 */
	// biome-ignore lint/suspicious/noThenProperty: intentional thenable for await support
	then<TResult1 = void, TResult2 = never>(
		onfulfilled?: // biome-ignore lint/suspicious/noConfusingVoidType: matches Promise<void> queue resolution
		((value: void) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
	): Promise<TResult1 | TResult2> {
		return this.queue.then(onfulfilled, onrejected);
	}

	/** Resolve locale + namespace from an optional context, falling back to the current state. */
	private resolveContext(context?: Partial<TranslateContext>) {
		const { currentLocale, baseNamespace } = this.state;

		const locale = context?.locale ?? currentLocale;
		const ns = context?.namespace
			? baseNamespace
				? `${baseNamespace}:${context.namespace}`
				: context.namespace
			: baseNamespace;

		return { locale, ns };
	}

	/**
	 * Look up a message in the resource tree and (if vars are provided)
	 * delegate to the configured formatter.
	 */
	private localize(
		resources: NamespaceResources | undefined,
		locale: Locale,
		key: MessageKey,
		vars?: Record<string, unknown>
	): string {
		if (!resources) {
			return key;
		}

		let localeData = resources[locale];
		if (!localeData) {
			localeData = resources[this.state.defaultLocale];
			if (!localeData) {
				return key;
			}
		}

		const value = localeData[key];
		if (value === undefined) {
			return key;
		}

		if (vars === undefined || Object.keys(vars).length === 0) {
			return value;
		}

		return this.state.translate(value, {
			locale,
			vars,
			formatting: this.state.formatting,
		});
	}

	/**
	 * Translate a message key in the current locale and base namespace.
	 *
	 * Falls back through:
	 * 1. {@link FaneeState.currentLocale Current locale}
	 * 2. The {@link FaneeState.defaultLocale default locale}
	 * 3. Returns the key itself if no translation is found
	 *
	 * @param key  - The message key to translate.
	 * @param vars - Optional variables for interpolation.
	 * @returns The translated string, or `key` if no translation exists.
	 *
	 * @example
	 * ```ts
	 * runtime.t("hello");           // "你好"
	 * runtime.t("greeting", { name: "Alice" }); // "Hello, Alice"
	 * ```
	 */
	t(key: MessageKey, vars?: Record<string, unknown>): string {
		const { locale, ns } = this.resolveContext();
		return this.localize(this.state.resources[ns], locale, key, vars);
	}

	/**
	 * Return a bound translate function pinned to a specific locale/namespace.
	 *
	 * Unlike {@link t}, this method captures the locale and namespace at call time
	 * so the returned function can be passed around (e.g. as a prop to a component)
	 * without retaining a reference to the runtime.
	 *
	 * @param context - Optional overrides for locale and/or namespace.
	 *                  If omitted, the current runtime values are captured.
	 * @returns A function with the signature `(key, vars?) => string`.
	 *
	 * @example
	 * ```ts
	 * const t = runtime.getT({ locale: "ja", namespace: "errors" });
	 * t("not_found"); // "見つかりませんでした"
	 * ```
	 */
	getT(context?: Partial<TranslateContext>): TranslateFunction {
		const { locale, ns } = this.resolveContext(context);
		const nsResources = this.state.resources[ns];

		return (key: MessageKey, vars?: Record<string, unknown>): string =>
			this.localize(nsResources, locale, key, vars);
	}

	/**
	 * Translate a message key into every available locale within the base namespace.
	 *
	 * Useful for generating locale-switching UIs, SEO hreflang tags, or
	 * pre-rendering all translations on the server.
	 *
	 * @param key  - The message key to translate.
	 * @param vars - Optional variables for interpolation (applied to every locale).
	 * @returns A record mapping each locale to its translated string.
	 *          Returns an empty object if the base namespace has no resources.
	 *
	 * @example
	 * ```ts
	 * runtime.tAll("welcome");
	 * // { en: "Welcome", "es": "Bienvenido", "fr": "Bienvenue", "zh-CN": "欢迎", ja: "ようこそ" }
	 * ```
	 */
	tAll(key: MessageKey, vars?: Record<string, unknown>): TranslationsByLocale {
		const { baseNamespace, resources } = this.state;
		const nsResources = resources[baseNamespace];
		const result: TranslationsByLocale = {};

		if (!nsResources) {
			return result;
		}

		for (const loc of Object.keys(nsResources)) {
			result[loc as Locale] = this.localize(nsResources, loc as Locale, key, vars);
		}

		return result;
	}

	/**
	 * Get the currently active locale.
	 *
	 * @returns The BCP 47 tag of the active locale (e.g. `"en"`, `"zh-CN"`).
	 */
	getLocale(): Locale {
		return this.state.currentLocale;
	}

	/**
	 * @internal
	 * Get the current state version.
	 *
	 * The version increments monotonically every time the runtime state is
	 * mutated. It is useful as a snapshot for external subscribers (e.g.
	 * React's `useSyncExternalStore`) that need to detect any state change.
	 *
	 * @returns The current version number.
	 */
	getVersion(): number {
		return this.version;
	}

	/**
	 * Collect every unique locale present across all loaded namespaces.
	 *
	 * @returns A sorted array of locale tags. Returns an empty array if no
	 *          resources have been loaded.
	 */
	getLocales(): Locale[] {
		const locales = new Set<Locale>();
		for (const resource of Object.values(this.state.resources)) {
			for (const locale of Object.keys(resource)) {
				locales.add(locale as Locale);
			}
		}
		return Array.from(locales).sort();
	}

	/**
	 * Return the complete resource tree.
	 *
	 * @returns The full {@link BundleResources} object (namespace → locale → messages).
	 */
	getAllTranslations(): BundleResources {
		return this.state.resources;
	}

	/**
	 * Return resources for a single namespace.
	 *
	 * @param ns - The namespace to look up.
	 * @returns The locale-indexed messages for that namespace, or `undefined`
	 *          if the namespace has not been loaded.
	 */
	getTranslationsForNamespace(ns: string): NamespaceResources | undefined {
		return this.state.resources[ns];
	}

	/**
	 * Wait for all queued plugins to finish.
	 *
	 * Because plugin registration and configuration are queued as a promise chain,
	 * you must `await runtime.ready()` (or `await runtime` directly) before calling
	 * translation methods if any plugin is asynchronous.
	 *
	 * @returns A promise that resolves once the plugin queue is empty.
	 *
	 * @example
	 * ```ts
	 * const runtime = new FaneeRuntime()
	 *   .use(asyncLoaderPlugin)
	 *   .config({ defaultLocale: "en" });
	 *
	 * await runtime.ready();
	 * console.log(runtime.t("hello")); // safe
	 * ```
	 */
	ready(): Promise<void> {
		return this.queue;
	}

	/**
	 * Switch the active locale at runtime.
	 *
	 * This is a synchronous operation that updates the current locale instantly.
	 * Subsequent calls to {@link t} and {@link getT} (without an explicit locale)
	 * will use this new locale.
	 *
	 * @param locale - The BCP 47 tag of the target locale.
	 *
	 * @example
	 * ```ts
	 * runtime.setLocale("fr");
	 * runtime.t("hello"); // "Bonjour"
	 * ```
	 */
	setLocale(locale: Locale) {
		this.state.currentLocale = locale;
		this.notify();
	}

	/**
	 * Switch the base namespace at runtime.
	 *
	 * Subsequent calls to {@link t} and related methods will resolve keys against
	 * this namespace. When a scoped namespace is set via {@link getT},
	 * it is prefixed with the base namespace using `:` as separator.
	 *
	 * @param ns - The namespace to set as the base.
	 *
	 * @example
	 * ```ts
	 * runtime.setNamespace("admin");
	 * runtime.t("dashboard_title"); // resolved from "admin" namespace
	 * ```
	 */
	setNamespace(ns: string) {
		this.state.baseNamespace = ns;
		this.notify();
	}

	/**
	 * Subscribe to state changes.
	 *
	 * The callback is invoked synchronously whenever the runtime state is mutated
	 * (via {@link setLocale}, {@link setNamespace}, or after a queued
	 * {@link use} / {@link config} operation resolves).
	 *
	 * @param callback - Called with the current {@link FaneeState} on every change.
	 * @returns An unsubscribe function. Call it to stop receiving notifications.
	 *
	 * @example
	 * ```ts
	 * const unsub = runtime.subscribe((state) => {
	 *   console.log("locale changed to", state.currentLocale);
	 * });
	 *
	 * runtime.setLocale("fr"); // logs "locale changed to fr"
	 * unsub();
	 * ```
	 */
	subscribe(callback: (state: FaneeState) => void): () => void {
		this.listeners.add(callback);
		return () => {
			this.listeners.delete(callback);
		};
	}
}
