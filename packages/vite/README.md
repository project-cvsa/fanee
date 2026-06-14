# @fanee/vite

Vite plugin for the Open Translation Bundle (OTB) format.

Scans an OTB bundle at build time, resolves module hierarchy, performs the OTB merge algorithm, and exposes the merged resources as a virtual module.

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

```ts
// main.tsx
import { resources } from "virtual:fanee";
import { FaneeRuntime } from "@fanee/core";

const runtime = new FaneeRuntime().config({
	defaultLocale: "en",
	currentLocale: "en",
	resources,
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `bundlePath` | `string` | — | Path to the OTB bundle directory. |
| `virtualId` | `string` | `"virtual:fanee"` | Virtual module ID to expose. |

## HMR

During development, editing `manifest.json`, `messages/*.json`, or `modules/**` files triggers HMR for the virtual module.

## License

MIT
