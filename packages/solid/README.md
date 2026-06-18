# @fanee/solid

SolidJS bindings for Fanee.

## Installation

```bash
npm install @fanee/core @fanee/solid
```

## Quick Start

With Vite:

```bash
npm install @fanee/vite
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fanee } from "@fanee/vite";

export default defineConfig({
	plugins: [
		fanee({
			bundlePath: "./i18n", // Change to your OTB bundle path
		}),
		react(),
	],
});
```

```tsx
import { FaneeRuntime } from "@fanee/core";
import { FaneeProvider, useT, useLocale, useSetLocale } from "@fanee/solid";
import { resources } from "virtual:fanee";

i18n.config({
	defaultLocale: "en",
	currentLocale: "en",
	resources,
});

function App() {
	const t = useT();
	const locale = useLocale();
	const setLocale = useSetLocale();

	return (
		<div>
			<p>{t("hello", { name: "World" })}</p>
			<p>Current locale: {locale()}</p>
			<button onClick={() => setLocale(locale() === "en" ? "fr" : "en")}>
				Switch locale
			</button>
		</div>
	);
}
```

## API

### `FaneeProvider`

Wraps your app and exposes a `FaneeRuntime` instance to descendant hooks.

### `useT(context?)`

Returns a reactive translate function. Automatically re-evaluates when the locale, namespace, or resources change.

### `useLocale()`

Returns a reactive accessor for the active locale. Call it (`locale()`) to read the current value.

### `useSetLocale()`

Returns a function to update the active locale.

### `useFanee()`

Returns `{ runtime, locale }` for direct access to the runtime instance. `locale` is a reactive accessor.

## License

MIT
