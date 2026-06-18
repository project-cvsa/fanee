import { createContext, useContext, type ReactNode } from "react";
import { i18n, type FaneeRuntime } from "@fanee/core";

const FaneeContext = createContext<FaneeRuntime | null>(null);

export interface FaneeProviderProps {
	/** FaneeRuntime instance to expose to the React tree. */
	runtime: FaneeRuntime;
	/** React children. */
	children: ReactNode;
}

/**
 * Provides a FaneeRuntime instance to descendant components.
 *
 * @example
 * ```tsx
 * const runtime = new FaneeRuntime().config({ currentLocale: "en" });
 *
 * <FaneeProvider runtime={runtime}>
 *   <App />
 * </FaneeProvider>
 * ```
 */
export function FaneeProvider({ runtime, children }: FaneeProviderProps) {
	return <FaneeContext.Provider value={runtime}>{children}</FaneeContext.Provider>;
}

/** @internal */
export function useRuntime(): FaneeRuntime {
	const runtime = useContext(FaneeContext);
	if (!runtime) {
		return i18n;
	}
	return runtime;
}
