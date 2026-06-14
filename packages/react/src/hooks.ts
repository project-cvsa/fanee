import { useCallback, useEffect, useReducer, useMemo } from "react";
import type { Locale, MessageKey, TranslateContext, TranslateFunction } from "@fanee/core";
import { useRuntime } from "./provider";

function useRuntimeVersion(): number {
	const runtime = useRuntime();
	const [version, bump] = useReducer((v: number) => v + 1, 0);

	useEffect(() => {
		return runtime.subscribe(() => {
			bump();
		});
	}, [runtime]);

	return version;
}

/**
 * Subscribe to the Fanee runtime and access it alongside the current locale.
 *
 * @returns An object with the runtime and the active locale.
 *
 * @example
 * ```tsx
 * const { runtime, locale } = useFanee();
 * ```
 */
export function useFanee(): { runtime: ReturnType<typeof useRuntime>; locale: Locale } {
	const runtime = useRuntime();
	const locale = useLocale();
	return useMemo(() => ({ runtime, locale }), [runtime, locale]);
}

/**
 * Return a translation function bound to the current runtime state and
 * an optional namespace/locale context.
 *
 * The returned function is recreated whenever the active locale, namespace,
 * or underlying resources change, so it remains reactive to runtime updates.
 *
 * @param context - Optional locale/namespace overrides.
 * @returns A `(key, vars?) => string` translate function.
 *
 * @example
 * ```tsx
 * const t = useT({ namespace: "errors" });
 * return <p>{t("not_found")}</p>;
 * ```
 */
export function useT(context?: Partial<TranslateContext>): TranslateFunction {
	const runtime = useRuntime();
	const version = useRuntimeVersion();
	const locale = context?.locale;
	const namespace = context?.namespace;

	// biome-ignore lint/correctness/useExhaustiveDependencies: version forces update on resource changes
	return useCallback(
		(key: MessageKey, vars?: Record<string, unknown>) => {
			const result = runtime.getT({ locale, namespace })(key, vars);
			return result;
		},
		[runtime, locale, namespace, version]
	);
}

/**
 * Read the currently active locale from the runtime.
 *
 * @returns The BCP-47 locale tag.
 */
export function useLocale(): Locale {
	const runtime = useRuntime();
	useRuntimeVersion();
	return runtime.getLocale();
}

/**
 * Return a setter for the runtime locale.
 *
 * @returns A function that updates the active locale.
 */
export function useSetLocale(): (locale: Locale) => void {
	const runtime = useRuntime();
	return useCallback((locale: Locale) => runtime.setLocale(locale), [runtime]);
}
