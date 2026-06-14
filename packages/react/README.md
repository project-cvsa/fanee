# @fanee/react

React bindings for Fanee.

Provides a Context-based provider and hooks to consume a `FaneeRuntime` from `@fanee/core` inside a React component tree.

## Installation

```bash
npm install @fanee/core @fanee/react
```

## Quick Start

```tsx
import { FaneeRuntime } from "@fanee/core";
import { FaneeProvider, useT, useLocale, useSetLocale } from "@fanee/react";

const runtime = new FaneeRuntime().config({
	defaultLocale: "en",
	currentLocale: "en",
	resources: {
		"": {
			en: { hello: "Hello, {name}!" },
			fr: { hello: "Bonjour, {name}!" },
		},
	},
});

function App() {
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
			<p>Current locale: {locale}</p>
			<button onClick={() => setLocale(locale === "en" ? "fr" : "en")}>
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

Returns a bound translate function. Re-renders when the locale, namespace, or resources change.

### `useLocale()`

Returns the active locale.

### `useSetLocale()`

Returns a function to update the active locale.

### `useFanee()`

Returns `{ runtime, locale }` for direct access to the runtime instance.

## License

MIT
