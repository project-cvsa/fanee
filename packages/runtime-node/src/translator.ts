import { MessageFormat } from "messageformat";
import { DraftFunctions } from "messageformat/functions";
import type { NamespaceResources, Locale } from "./types";

const messageCache = new Map<string, Map<string, MessageFormat<string, string>>>();

export function getOrCreateMessageFormat(
	locale: string,
	key: string,
	value: string
): MessageFormat<string, string> {
	let localeCache = messageCache.get(locale);
	if (!localeCache) {
		localeCache = new Map();
		messageCache.set(locale, localeCache);
	}

	let mf = localeCache.get(key);
	if (!mf) {
		try {
			mf = new MessageFormat([locale], value, { functions: DraftFunctions });
		} catch (error) {
			console.warn(
				`[fanee] Failed to parse message for key "${key}" in locale "${locale}": ${error}`
			);
			mf = new MessageFormat([locale], value, { functions: DraftFunctions });
		}
		localeCache.set(key, mf);
	}
	return mf;
}

export function createTranslationFunction(
	resources: NamespaceResources | undefined,
	locale: Locale,
	defaultLocale: Locale
): (key: string, vars?: Record<string, unknown>) => string {
	return (key: string, vars?: Record<string, unknown>): string => {
		if (!resources) {
			console.warn(`[fanee] No resources found`);
			return key;
		}

		let localeData = resources[locale];

		if (!localeData) {
			localeData = resources[defaultLocale];
			if (!localeData) {
				return key;
			}
		}

		const value = localeData[key];
		if (value === undefined) {
			console.warn(`[fanee] Key not found: ${key} in locale: ${locale}`);
			return key;
		}

		if (vars === undefined || Object.keys(vars).length === 0) {
			return value;
		}

		const mf = getOrCreateMessageFormat(locale, key, value);
		try {
			return mf.format(vars);
		} catch (error) {
			console.warn(`[fanee] Failed to format message for key "${key}": ${error}`);
			return value;
		}
	};
}
