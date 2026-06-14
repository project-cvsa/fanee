# @fanee/runtime-node

OTB (Open Translation Bundle) filesystem provider for Node.js.

This package provides `initFaneeNode`, a plugin that scans an OTB bundle directory on disk and loads its translations into a `FaneeRuntime` instance from `@fanee/core`.

## Installation

```bash
npm install @fanee/core @fanee/runtime-node
```

## Quick Start

```typescript
import { i18n } from "@fanee/core";
import { initFaneeNode } from "@fanee/runtime-node";

i18n
	.config({ defaultLocale: "en", currentLocale: "en" })
	.use(initFaneeNode({ bundlePath: "/path/to/bundle" }));

await i18n.ready();

i18n.t("greeting");
```

## API

### `initFaneeNode(config)`

```typescript
function initFaneeNode(config: {
	bundlePath: string;
}): (state: FaneeState) => Promise<FaneeState>;
```

Returns a state transformer function. When passed to `FaneeRuntime.use()`, it scans the OTB directory at `bundlePath`, discovers all modules and their message files, and merges the result into the runtime state.

### Translation Methods

All translation methods live on the `FaneeRuntime` instance from `@fanee/core`.

#### `t(key, vars?)`

Translates a key using the current locale and base namespace. Returns a string.

```typescript
// Config: baseNamespace = "web"

i18n.t("key");                          // looks up "web" with current locale

i18n.t("greeting", { name: "World" });  // with MF2 variable interpolation
```

#### `getT(context?)`

Returns a translation function bound to the given context. The `context.namespace` appends to the base namespace from `.config()`.

```typescript
// Config: baseNamespace = "web"

i18n.getT()("key");                          // looks up "web"

i18n.getT({ namespace: "auth" })("key");     // looks up "web:auth"

i18n.getT({ locale: "fr" })("key");          // looks up "web" with locale "fr"
i18n.getT({ namespace: "auth", locale: "fr" })("key");  // looks up "web:auth" with locale "fr"
```

#### `tAll(key, vars?)`

Returns translations for a key in all available locales (uses base namespace).

```typescript
i18n.tAll("greeting");
// { en: "Hello", fr: "Bonjour", de: "Hallo" }

i18n.tAll("items", { count: 5 });
// { en: "5 items", fr: "5 éléments", de: "5 Artikel" }
```

#### `getLocale()`

Returns the current locale.

```typescript
i18n.getLocale();  // "en"
```

#### `getLocales()`

Returns all available locales.

```typescript
i18n.getLocales();  // ["de", "en", "fr"]
```

#### `setLocale(locale)`

Sets the current locale.

```typescript
i18n.setLocale("fr");
i18n.getLocale();  // "fr"
```

#### `getAllTranslations()`

Returns all loaded translations across all namespaces and locales.

```typescript
const all = i18n.getAllTranslations();
// { web: { en: { greeting: "Hello" }, fr: { greeting: "Bonjour" } }, "web:auth": { ... } }
```

#### `getTranslationsForNamespace(ns)`

Returns translations for a specific namespace, or `undefined` if not found.

```typescript
const webTranslations = i18n.getTranslationsForNamespace("web");
// { en: { greeting: "Hello" }, fr: { greeting: "Bonjour" } }

const authTranslations = i18n.getTranslationsForNamespace("web:auth");
// { en: { login: "Login" }, fr: { login: "Connexion" } }

i18n.getTranslationsForNamespace("nonexistent"); // undefined
```

## Translation Function

The translation function supports MF2 MessageFormat with variable interpolation:

```typescript
const t = i18n.getT();

t("greeting");                              // "Hello"
t("greeting", { name: "World" });           // "Hello, World!"
t("price", { amount: 1234.56 });            // "Total: $1,234.56"
t("date", { today: new Date("2024-02-02") }); // "Today is Feb 2, 2024"
t("status", { gender: "male" });            // "A man"
t("status", { gender: "female" });          // "A woman"
t("items", { count: 1 });                   // "a item"
t("items", { count: 5 });                   // "5 items"
```

## Locale Fallback

When a key is missing in the current locale, the runtime falls back to the default locale:

```typescript
// messages/en.json: { "greeting": "Hello" }
// messages/fr.json: {}

i18n.getT({ locale: "fr" })("greeting"); // "Hello"
```

If the key is missing in both, the key itself is returned:

```typescript
i18n.t("nonexistent"); // "nonexistent"
```

## License

MIT
