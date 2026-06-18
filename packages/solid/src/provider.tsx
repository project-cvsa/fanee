import {
	createContext,
	useContext,
	createSignal,
	onCleanup,
	createMemo,
	type JSX,
	type Accessor,
	createEffect,
} from "solid-js";
import { i18n, type FaneeRuntime, type Locale } from "@fanee/core";

interface FaneeContextValue {
	runtime: FaneeRuntime;
	locale: Accessor<Locale>;
	version: Accessor<number>;
}

const FaneeContext = createContext<FaneeContextValue>();

export interface FaneeProviderProps {
	runtime: FaneeRuntime;
	children: JSX.Element;
}

export function FaneeProvider(props: FaneeProviderProps) {
	const [locale, setLocale] = createSignal<Locale>(props.runtime.getLocale());
	const [version, setVersion] = createSignal<number>(props.runtime.getVersion());

	let unsub: (() => void) | undefined;

	createEffect(() => {
		if (unsub) unsub();

		const currentRuntime = props.runtime;

		setLocale(() => currentRuntime.getLocale());
		setVersion(currentRuntime.getVersion());

		unsub = currentRuntime.subscribe(() => {
			setLocale(() => currentRuntime.getLocale());
			setVersion(currentRuntime.getVersion());
		});
	});

	onCleanup(() => {
		if (unsub) unsub();
	});

	const value = createMemo<FaneeContextValue>(() => ({
		get runtime() {
			return props.runtime;
		},
		locale,
		version,
	}));

	return <FaneeContext.Provider value={value()}>{props.children}</FaneeContext.Provider>;
}

const [globalLocale, setGlobalLocale] = createSignal<Locale>(i18n.getLocale());
const [globalVersion, setGlobalVersion] = createSignal<number>(i18n.getVersion());

i18n.subscribe(() => {
	setGlobalLocale(() => i18n.getLocale());
	setGlobalVersion(i18n.getVersion());
});

const fallbackContext: FaneeContextValue = {
	runtime: i18n,
	locale: globalLocale,
	version: globalVersion,
};

export function useFaneeContext(): FaneeContextValue {
	const ctx = useContext(FaneeContext);
	return ctx ?? fallbackContext;
}
