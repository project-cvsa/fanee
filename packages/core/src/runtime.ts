import type {
	FaneeState,
	Locale,
	MessageKey,
	TranslateContext,
	TranslateFunction,
	TranslationsByLocale,
	NamespaceResources,
	BundleResources,
} from "./types";
import { defaultState } from "./state";
import { createTranslationFunction } from "./translator";

export class FaneeRuntime {
	private state: FaneeState;
	private queue: Promise<void>;

	constructor() {
		this.state = defaultState();
		this.queue = Promise.resolve();
	}

	use(
		fn: (state: FaneeState) => FaneeState | Promise<FaneeState>
	): this {
		this.queue = this.queue.then(async () => {
			this.state = await fn(this.state);
		});
		return this;
	}

	config(patch: Partial<FaneeState>): this {
		this.queue = this.queue.then(async () => {
			this.state = { ...this.state, ...patch };
		});
		return this;
	}

	// biome-ignore lint/suspicious/noThenProperty: intentional thenable for await support
	then<TResult1 = void, TResult2 = never>(
		onfulfilled?:
			// biome-ignore lint/suspicious/noConfusingVoidType: matches Promise<void> queue resolution
			| ((value: void) => TResult1 | PromiseLike<TResult1>)
			| null,
		onrejected?:
			| ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
			| null
	): Promise<TResult1 | TResult2> {
		return this.queue.then(onfulfilled, onrejected);
	}

	private resolveContext(context?: Partial<TranslateContext>) {
        const { currentLocale, baseNamespace } = this.state;
        
        const locale = context?.locale ?? currentLocale;
        const ns = context?.namespace 
            ? (baseNamespace ? `${baseNamespace}:${context.namespace}` : context.namespace)
            : baseNamespace;

        return { locale, ns };
    }

    private getTranslationFunction(ns: string, locale: Locale): TranslateFunction {
        const { resources, defaultLocale, formatting, translate } = this.state;
        const nsResources = resources[ns];

        if (!nsResources) {
            return (k: MessageKey) => k;
        }

        return createTranslationFunction(
            nsResources,
            locale,
            defaultLocale,
            formatting,
            translate
        );
    }

    t(context?: Partial<TranslateContext>): TranslateFunction {
        const { locale, ns } = this.resolveContext(context);
        return this.getTranslationFunction(ns, locale as Locale);
    }

    tAll(key: MessageKey, vars?: Record<string, unknown>): TranslationsByLocale {
        const { baseNamespace, resources } = this.state;
        const nsResources = resources[baseNamespace];
        const result: TranslationsByLocale = {};

        if (!nsResources) {
            return result;
        }

        for (const loc of Object.keys(nsResources)) {
            const t = this.getTranslationFunction(baseNamespace, loc as Locale);
            result[loc as Locale] = t(key, vars);
        }

        return result;
    }

	getLocale(): Locale {
		return this.state.currentLocale;
	}

	getLocales(): Locale[] {
		const locales = new Set<Locale>();
		for (const resource of Object.values(this.state.resources)) {
			for (const locale of Object.keys(resource)) {
				locales.add(locale as Locale);
			}
		}
		return Array.from(locales).sort();
	}

	getAllTranslations(): BundleResources {
		return this.state.resources;
	}

	getTranslationsForNamespace(
		ns: string
	): NamespaceResources | undefined {
		return this.state.resources[ns];
	}

	ready(): Promise<void> {
		return this.queue;
	}

	setLocale(locale: Locale) {
		this.state.currentLocale = locale;
	}
}
