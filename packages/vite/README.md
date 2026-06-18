# @fanee/vite

Vite plugin for the Open Translation Bundle (OTB) format.

## Installation

```bash
npm install -D @fanee/vite
```

### TypeScript Configuration

In order to make virtual modules available in TypeScript, add the following to your `tsconfig.json`:

```json
{
	"compilerOptions": {
		"types": ["vite/client", "@fanee/vite/client"]
	}
}
```

## Usage

Import and configure the plugin:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { fanee } from "@fanee/vite";

export default defineConfig({
	plugins: [
		fanee({
			bundlePath: "./i18n",
		}),
	],
});
```

Import the translation resources via `virtual:fanee` module:

```ts
import { resources } from "virtual:fanee";
import { i18n } from "@fanee/core";

i18n.config({
	defaultLocale: "en",
	currentLocale: "en",
	resources,
});
```

### Tree shaking

If you only need strings contained within a specific namespace, you can import them only from `virtual:fanee/namespace`:

```ts
import { resources } from "virtual:fanee/checkout";
import { i18n } from "@fanee/core";

i18n.config({
	defaultLocale: "en",
	currentLocale: "en",
	resources,
});
```

`resources` will only contain strings under the namespace `checkout`, which results in smaller bundle size.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `bundlePath` | `string` | — | Path to the OTB bundle directory. |
| `virtualId` | `string` | `"virtual:fanee"` | Virtual module ID to expose. |

## License

MIT
