import { MessageFormat } from "messageformat";
import { DraftFunctions } from "messageformat/functions";
import type { TranslateOptions } from "./types";

const cache = new Map<string, Map<string, MessageFormat<string, string>>>();

function getOrCreateMessageFormat(
	locale: string,
	key: string,
	message: string
): MessageFormat<string, string> {
	let localeCache = cache.get(locale);
	if (!localeCache) {
		localeCache = new Map();
		cache.set(locale, localeCache);
	}

	let mf = localeCache.get(key);
	if (mf) {
		return mf;
	}
	mf = new MessageFormat([locale], message, { functions: DraftFunctions });
	localeCache.set(key, mf);
	return mf;
}

export function defaultTranslate(
	msg: string,
	options?: TranslateOptions
): string {
	if (!options?.vars || Object.keys(options.vars).length === 0) {
		return msg;
	}

	if (options.formatting === "identity") {
		return msg;
	}

	const { locale, vars } = options;
	const mf = getOrCreateMessageFormat(locale, msg, msg);

	return mf.format(vars, (error) => {
		console.warn(`[fanee] Failed to format message: ${error}`);
	});
}
