# @fanee/runtime-node

OTB (Open Translation Bundle) runtime for Node.js.

## Installation

```bash
npm install @fanee/runtime-node
```

## Usage

```typescript
import { createRuntime, createTranslator } from "@fanee/runtime-node";
```

## API

Currently this library only support unpacked OTB bundle.

### createRuntime(rootPath, options)

Creates an OTB runtime instance from a bundle's root directory.

```typescript
const runtime = await createRuntime("/path/to/bundle", {
  defaultLocale: "en"
});
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `defaultLocale` | `string` | Default locale (required) |

#### Methods

**`runtime.t()`** — Returns a translation function for the current context.

**`runtime.setContext(context)`** — Sets the resolution context.

```typescript
runtime.setContext({ namespace: "web" });           // Set namespace
runtime.setContext({ namespace: "web:billing" });    // Nested namespace
runtime.setContext({ locale: "fr-FR" });             // Set locale
runtime.setContext({ namespace: "", locale: "fr" }); // Clear namespace, set locale
```

**`runtime.setLocale(locale)`** — Changes the current locale.

**`runtime.getLocales()`** — Returns all available locales in the project.

### createTranslator(runtime, options)

Factory function to create isolated translator functions.

```typescript
const translate = createTranslator(runtime, {
  namespace: "",
  locale: "en"
});

translate("greeting"); // "Hello"
```

## Translation Function

The translation function (`t()`) supports MF2 MessageFormat with variable interpolation:

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

runtime.setContext({ namespace: "", locale: "fr" });
t("greeting"); // "Hello" (fallback to default locale)
```

If the key is missing in both, the key itself is returned:

```typescript
t("nonexistent"); // "nonexistent"
```

## License

MIT
