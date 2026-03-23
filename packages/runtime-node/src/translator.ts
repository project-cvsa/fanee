import { MessageFormat } from "messageformat";
import { DraftFunctions } from "messageformat/functions";
import type { TranslationFunction, ResourceData, ResolutionContext, RuntimeConfig } from "./types";

const messageCache = new Map<string, Map<string, MessageFormat<string, string>>>();

function getOrCreateMessageFormat(locale: string, key: string, value: string): MessageFormat<string, string> {
	let localeCache = messageCache.get(locale);
	if (!localeCache) {
		localeCache = new Map();
		messageCache.set(locale, localeCache);
	}

	let mf: MessageFormat<string, string> | undefined = localeCache.get(key);
	if (!mf) {
		try {
			mf = new MessageFormat([locale], value, { functions: DraftFunctions });
		} catch (error) {
			console.warn(`[server-unpack] Failed to parse message for key "${key}" in locale "${locale}": ${error}`);
			mf = new MessageFormat([locale], value, { functions: DraftFunctions });
		}
		localeCache.set(key, mf);
	}
	return mf;
}

export function createTranslationFunction(
	resources: ResourceData | undefined,
	context: ResolutionContext,
	config: RuntimeConfig,
): TranslationFunction {
	return (key: string, vars?: Record<string, unknown>): string => {
		const locale = context.locale ?? config.defaultLocale ?? "en";

		if (!resources) {
			console.warn(`[server-unpack] No resources found for namespace: ${context.namespace}`);
			return key;
		}

		let localeData = resources[locale];

		if (!localeData) {
			const defaultLocale = config.defaultLocale ?? "en";
			localeData = resources[defaultLocale];

			if (!localeData) {
				console.warn(`[server-unpack] Locale not found: ${locale} (default: ${defaultLocale})`);
				return key;
			}
		}

		const value = localeData[key];

		if (value === undefined) {
			console.warn(`[server-unpack] Key not found: ${key} in locale: ${locale}`);
			return key;
		}

		if (vars === undefined || Object.keys(vars).length === 0) {
			return value;
		}

		const mf = getOrCreateMessageFormat(locale, key, value);
		try {
			return mf.format(vars);
		} catch (error) {
			console.warn(`[server-unpack] Failed to format message for key "${key}": ${error}`);
			return value;
		}
	};
}
