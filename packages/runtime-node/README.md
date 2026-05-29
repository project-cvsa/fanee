# @fanee/runtime-node

OTB (Open Translation Bundle) runtime for Node.js.

## Installation

```bash
npm install @fanee/runtime-node
```

## Usage

```typescript
import { FaneeRuntime } from "@fanee/runtime-node";
```

## Initialize

```typescript
const runtime = new FaneeRuntime({
	bundlePath: "/path/to/bundle",
	defaultLocale: "en",
	namespace: "web"  // optional base namespace
});

await runtime.load();
```

## API

Currently this library only supports unpacked OTB bundle.

### `runtime.t(context?)`

Returns a translation function. The `context.namespace` is appended to the base namespace from constructor.

```typescript
// Constructor: namespace = "web"

// Base namespace
runtime.t()("key");  // looks up "web"

// Append namespace
runtime.t({ namespace: "auth" })("key");  // looks up "web:auth"

// Set locale
runtime.t({ locale: "fr" })("key");  // looks up "web" with locale "fr"
runtime.t({ namespace: "auth", locale: "fr" })("key");  // looks up "web:auth" with locale "fr"
```

### `runtime.tAll(key, vars?)`

Returns translations for a key in all available locales (uses base namespace).

```typescript
runtime.tAll("greeting");
// { en: "Hello", fr: "Bonjour", de: "Hallo" }

runtime.tAll("items", { count: 5 });
// { en: "5 items", fr: "5 éléments", de: "5 Artikel" }
```

### `runtime.getLocales()`

Returns all available locales.

```typescript
runtime.getLocales();  // ["de", "en", "fr"]
```

### `runtime.getAllTranslations()`

Returns all loaded translations across all namespaces and locales.

```typescript
const all = runtime.getAllTranslations();
// { web: { en: { greeting: "Hello" }, fr: { greeting: "Bonjour" } }, "web:auth": { ... } }
```

### `runtime.getTranslationsForNamespace(ns)`

Returns translations for a specific namespace, or `undefined` if not found.

```typescript
const webTranslations = runtime.getTranslationsForNamespace("web");
// { en: { greeting: "Hello" }, fr: { greeting: "Bonjour" } }

const authTranslations = runtime.getTranslationsForNamespace("web:auth");
// { en: { login: "Login" }, fr: { login: "Connexion" } }

runtime.getTranslationsForNamespace("nonexistent"); // undefined
```

## Translation Function

The translation function supports MF2 MessageFormat with variable interpolation:

```typescript
const t = runtime.t();

// Simple key
t("greeting");                    // "Hello"

// Variable interpolation
t("greeting", { name: "World" }); // "Hello, World!"

// Number formatting
t("price", { amount: 1234.56 }); // "Total: $1,234.56"

// DateTime formatting
t("date", { today: new Date("2024-02-02") }); // "Today is Feb 2, 2024"

// Select
t("status", { gender: "male" });   // "A man"
t("status", { gender: "female" }); // "A woman"

// Plural
t("items", { count: 1 }); // "a item"
t("items", { count: 5 }); // "5 items"
```

## Locale Fallback

When a key is missing in the current locale, the runtime falls back to the default locale:

```typescript
// messages/en.json: { "greeting": "Hello" }
// messages/fr.json: {}

runtime.t({ locale: "fr" })("greeting"); // "Hello" (fallback to default locale)
```

If the key is missing in both, the key itself is returned:

```typescript
runtime.t()("nonexistent"); // "nonexistent"
```

## License

MIT
