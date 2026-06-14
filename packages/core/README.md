# @fanee/core

Core runtime for the OTB (Open Translation Bundle) format.

Provides `FaneeRuntime`, a plugin-based i18n runtime with MF2 MessageFormat support, and `i18n`, a pre-instantiated singleton.

## Installation

```bash
npm install @fanee/core
```

## Quick Start

```typescript
import { FaneeRuntime } from "@fanee/core";

const runtime = new FaneeRuntime().config({
	defaultLocale: "en",
	currentLocale: "en",
	resources: {
		"": {
			en: { greeting: "Hello, {name}!" },
			fr: { greeting: "Bonjour, {name}!" },
		},
	},
});

runtime.t("greeting");                          // "Hello, {name}!"
runtime.t("greeting", { name: "World" });        // "Hello, World!"

runtime.setLocale("fr");
runtime.t("greeting", { name: "World" });        // "Bonjour, World!"
```

Or use the global singleton:

```typescript
import { i18n } from "@fanee/core";

i18n.config({
	defaultLocale: "en",
	currentLocale: "en",
	resources: {
		"": { en: { hello: "Hello, World!" } },
	},
});

i18n.t("hello"); // "Hello, World!"
```

## API

### `FaneeRuntime`

#### `config(patch)`

Shallow-merges a partial state patch into the runtime state. Returns `this` for chaining.

```typescript
runtime.config({
	defaultLocale: "en",
	currentLocale: "en",
	baseNamespace: "web",
	resources: { /* ... */ },
});
```

#### `use(fn)`

Registers a plugin function that transforms the runtime state. Plugins run sequentially in registration order. Returns `this` for chaining.

```typescript
runtime.use(async (state) => {
	const resources = await loadFromAPI();
	return { ...state, resources };
});
```

#### `ready()`

Returns a `Promise<void>` that resolves when all queued plugins have completed. The runtime is also thenable, so `await runtime` works as a shorthand.

```typescript
const runtime = new FaneeRuntime()
	.use(asyncPlugin)
	.config({ defaultLocale: "en" });

await runtime.ready();
// or: await runtime;
```

### Translation Methods

#### `t(key, vars?)`

Translates a key using the current locale and base namespace. Returns a string.

```typescript
runtime.t("key");                          // looks up in base namespace with current locale
runtime.t("greeting", { name: "World" });  // with MF2 variable interpolation
```

#### `getT(context?)`

Returns a translation function bound to the given context. The `context.namespace` appends to the base namespace with `:` as separator.

```typescript
const t = runtime.getT();
t("key"); // looks up in base namespace

const tAuth = runtime.getT({ namespace: "auth" });
tAuth("login"); // looks up in "base:auth" (or "auth" if base namespace is "")

const tFr = runtime.getT({ locale: "fr" });
tFr("key"); // looks up with locale "fr"
```

#### `tAll(key, vars?)`

Returns translations for a key in all available locales within the base namespace.

```typescript
runtime.tAll("greeting");
// { en: "Hello", fr: "Bonjour", de: "Hallo" }
```

#### `getLocale()`

Returns the current locale BCP 47 tag.

#### `getLocales()`

Returns a sorted array of all locales present in loaded resources.

#### `setLocale(locale)`

Sets the current locale. Subsequent `t()` calls use the new locale.

```typescript
runtime.setLocale("fr");
runtime.t("greeting"); // "Bonjour"
```

#### `setNamespace(ns)`

Sets the base namespace. Subsequent lookups resolve against this namespace.

```typescript
runtime.setNamespace("admin");
runtime.t("dashboard_title");
```

#### `getAllTranslations()`

Returns the full resource tree (`BundleResources`).

#### `getTranslationsForNamespace(ns)`

Returns locale-indexed messages for a namespace, or `undefined`.

#### `subscribe(callback)`

Subscribes to state changes. Returns an unsubscribe function.

```typescript
const unsub = runtime.subscribe((state) => {
	console.log("locale changed to", state.currentLocale);
});
unsub();
```

### `i18n` singleton

A pre-instantiated `FaneeRuntime` exported for convenience.

```typescript
import { i18n } from "@fanee/core";
```

## Translation Format

By default, messages are formatted using MF2 MessageFormat with variable interpolation:

```typescript
runtime.t("greeting", { name: "World" });             // "Hello, World!"
runtime.t("price", { amount: 1234.56 });              // "Total: $1,234.56"
runtime.t("date", { today: new Date("2024-02-02") }); // "Today is Feb 2, 2024"
runtime.t("items", { count: 1 });                     // "a item"
runtime.t("items", { count: 5 });                     // "5 items"
```

Set `formatting` to `"identity"` to disable formatting.

## Locale Fallback

When a key is missing in the current locale, the runtime falls back to the default locale. If missing in both, the key itself is returned.

## License

MIT
