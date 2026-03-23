import type { Runtime, ResolutionContext, TranslationFunction } from "./types";

export function createTranslator(
	runtime: Runtime,
	context: Partial<ResolutionContext>,
): TranslationFunction {
	const currentContext = runtime.getContext();
	runtime.setContext({
		namespace: context.namespace || currentContext.namespace,
		locale: context.locale || currentContext.locale
	});
	return runtime.t();
}
