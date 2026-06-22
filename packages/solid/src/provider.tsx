import { createContext, useContext, createSignal, onCleanup, type JSX, type Accessor } from "solid-js";
import h from "solid-js/h";
import { i18n, type FaneeRuntime, type Locale } from "@fanee/core";

interface FaneeContextValue {
	runtime: FaneeRuntime;
	locale: Accessor<Locale>;
	version: Accessor<number>;
}

const FaneeContext = createContext<FaneeContextValue>();

export interface FaneeProviderProps {
	/** FaneeRuntime instance to expose to the Solid tree. */
	runtime: FaneeRuntime;
	/** Solid children. */
	children: JSX.Element;
}

/**
 * Provides a FaneeRuntime instance to descendant components.
 *
 * @example
 * ```tsx
 * const runtime = new FaneeRuntime().config({ currentLocale: "en" });
 *
 * <FaneeProvider runtime={runtime}>
 * <App />
 * </FaneeProvider>
 * ```
 */
export function FaneeProvider(props: FaneeProviderProps) {
	const [locale, setLocale] = createSignal<Locale>(props.runtime.getLocale());
	const [version, setVersion] = createSignal<number>(props.runtime.getVersion());

	const unsub = props.runtime.subscribe(() => {
		setLocale(() => props.runtime.getLocale());
		setVersion(props.runtime.getVersion());
	});
	onCleanup(unsub);

	const value: FaneeContextValue = {
		runtime: props.runtime,
		locale,
		version,
	};

	return h(FaneeContext.Provider, {
		value,
		get children() {
			return props.children;
		},
	});
}

/** @internal */
export function useFaneeContext(): FaneeContextValue {
	const ctx = useContext(FaneeContext);
	if (!ctx) {
		const [locale] = createSignal<Locale>(i18n.getLocale());
		const [version] = createSignal<number>(i18n.getVersion());
		return { runtime: i18n, locale, version };
	}
	return ctx;
}