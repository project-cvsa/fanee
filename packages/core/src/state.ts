import type { FaneeState } from "./types";
import { defaultTranslate } from "./translator";

export function defaultState(): FaneeState {
	return {
		resources: {},
		defaultLocale: "en",
		currentLocale: "en",
		baseNamespace: "",
		formatting: "mf2",
		translate: defaultTranslate,
	};
}
