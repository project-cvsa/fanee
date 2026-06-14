import type { FaneeState } from "@fanee/core";
import { scanBundle } from "./scanner";

export function initFaneeNode(config: {
	bundlePath: string;
}): (state: FaneeState) => Promise<FaneeState> {
	return async (state) => {
		const resources = await scanBundle(config.bundlePath);
		return { ...state, resources };
	};
}
