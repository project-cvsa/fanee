# @fanee/solid

SolidJS bindings for Fanee.

## Installation

```bash
bun add @fanee/core @fanee/solid
# or npm install @fanee/core @fanee/solid
```

## Quick Start

### Vite Configuration

```ts
// vite.config.ts
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { fanee } from "@fanee/vite";

export default defineConfig({
	plugins: [
		fanee({
			bundlePath: "./i18n",
		}),
		solidPlugin(),
	],
});
```

### Application Setup

```tsx
// App.tsx
import { FaneeRuntime } from "@fanee/core";
import { FaneeProvider, useT, useLocale, useSetLocale } from "@fanee/solid";
import { resources } from "virtual:fanee";

const runtime = new FaneeRuntime().config({
	defaultLocale: "en",
	currentLocale: "en",
	resources,
});

export function App() {
	return (
		<FaneeProvider runtime={runtime}>
			<Greeting />
		</FaneeProvider>
	);
}

function Greeting() {
	const t = useT();
	const locale = useLocale();
	const setLocale = useSetLocale();

	return (
		<div>
			<p>{t("hello", { name: "World" })}</p>
			<p>Current locale: {locale()}</p>
			<button onClick={() => setLocale(locale() === "en" ? "zh-CN" : "en")}>
				Switch locale
			</button>
		</div>
	);
}
```

## API Reference

### `<FaneeProvider runtime={runtime}>`

Context provider that makes a `FaneeRuntime` instance available to all child components.

### `useT(context?)`

Returns a translation function `(key: string, vars?: Record<string, unknown>) => string`.
Accepts an optional context override `{ namespace?: string, locale?: string }` or an accessor function returning overrides for dynamic reactivity.

```tsx
// Static namespace override
const tAuth = useT({ namespace: "auth" });

// Reactive namespace override
const t = useT(() => ({ namespace: activeTab() }));
```

### `useLocale()`

Returns a reactive Solid accessor for the active BCP 47 locale tag:

```tsx
const locale = useLocale();
return <span>{locale()}</span>;
```

### `useSetLocale()`

Returns a function to update the active locale on the underlying runtime:

```tsx
const setLocale = useSetLocale();
setLocale("ja");
```

### `useFanee()`

Returns an object with `{ runtime, locale }` where `runtime` is the `FaneeRuntime` instance and `locale` is a reactive accessor.

## License

MIT
