import { createMemo, type Accessor } from "solid-js";
import type { Locale, MessageKey, TranslateContext, TranslateFunction } from "@fanee/core";
import { useFaneeContext } from "./provider";

/**
 * Subscribe to the Fanee runtime and access it alongside the current locale.
 *
 * @returns An object with the runtime and a reactive locale accessor.
 *
 * @example
 * ```tsx
 * const { runtime, locale } = useFanee();
 * <p>Current locale: {locale()}</p>
 * ```
 */
export function useFanee(): { runtime: ReturnType<typeof useFaneeContext>["runtime"]; locale: Accessor<Locale> } {
	const { runtime, locale } = useFaneeContext();
	return { runtime, locale };
}

/**
 * Return a reactive translation function bound to the current runtime state and
 * an optional namespace/locale context.
 *
 * The returned function automatically re-evaluates when the active locale,
 * namespace, or underlying resources change.
 *
 * @param context - Optional locale/namespace overrides, or a functional getter to track dynamic property changes.
 * @returns A `(key, vars?) => string` translate function.
 *
 * @example
 * ```tsx
 * const t = useT({ namespace: "errors" });
 * return <p>{t("not_found")}</p>;
 * ```
 */
export function useT(context?: Partial<TranslateContext> | (() => Partial<TranslateContext>)): TranslateFunction {
	const { runtime, version } = useFaneeContext();
	const normalizeContext = typeof context === "function" ? context : () => context ?? {};

	const tFn = createMemo(() => {
		version();
		const ctx = normalizeContext();
		return runtime.getT({ locale: ctx.locale, namespace: ctx.namespace });
	});

	return (key: MessageKey, vars?: Record<string, unknown>) => tFn()(key, vars);
}

/**
 * Read the currently active locale from the runtime as a reactive accessor.
 *
 * @returns A reactive accessor for the BCP-47 locale tag.
 */
export function useLocale(): Accessor<Locale> {
	const { locale } = useFaneeContext();
	return locale;
}

/**
 * Return a setter for the runtime locale.
 *
 * @returns A function that updates the active locale.
 */
export function useSetLocale(): (locale: Locale) => void {
	const { runtime } = useFaneeContext();
	return (locale: Locale) => runtime.setLocale(locale);
}