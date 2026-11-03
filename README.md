![Next-gen i18n solution](.github/assets/banner.png "Next-gen i18n solution")

# Fanee

Fanee is a modular internationalization (i18n) ecosystem built on the **Open Translation Bundle (OTB)** specification. It provides a standardized directory structure for hierarchical translation resources alongside a high-performance runtime, build plugins, framework bindings, and AST-powered verification tooling.

## Workspace Overview

```
fanee/
├── packages/
│   ├── core/         # Core runtime, state management, and MF2 message formatting
│   ├── fs-scanner/   # OTB filesystem and zip archive bundle scanner
│   ├── node/         # Node.js filesystem provider plugin for @fanee/core
│   ├── vite/         # Vite plugin for virtual module resolution and HMR
│   ├── react/        # React context provider and hooks (useT, useLocale)
│   ├── solid/        # SolidJS context provider and reactive accessors
│   └── tools/        # CLI toolchain, AST scanner, unused key detector, typegen
├── apps/
│   ├── example-react/# Vite + React demo application
│   └── example-solid/# Vite + SolidJS demo application
└── spec/             # Open Translation Bundle (OTB) specification
```

## Packages

| Package | Description | Version |
|---|---|---|
| [`@fanee/core`](./packages/core) | Core runtime, translation resolution, and MF2 formatting engine | `0.9.0` |
| [`@fanee/tools`](./packages/tools) | AST code scanner, resource validation CLI, and TypeScript generator | `0.9.0` |
| [`@fanee/vite`](./packages/vite) | Vite plugin providing `virtual:fanee` imports with CSR & SSR HMR | `0.9.0` |
| [`@fanee/solid`](./packages/solid) | SolidJS bindings with fine-grained reactivity | `0.9.0` |
| [`@fanee/react`](./packages/react) | React bindings with concurrent mode and external store support | `0.9.0` |
| [`@fanee/node`](./packages/node) | Node.js provider for loading OTB bundles from disk into the runtime | `0.9.0` |
| [`@fanee/fs-scanner`](./packages/fs-scanner) | Bundle directory traversal, module inheritance, and zip extractor | `0.9.0` |

## Specification

The [OTB Specification](./spec/README.md) defines a directory structure and metadata standard for modular translations:
- Root `manifest.json` defines the bundle format, target locales, and default formatting mode.
- Namespaces are mapped from filesystem directory hierarchies under `modules/`.
- Descendant modules inherit and override messages from parent modules, with support for `"standalone": true` isolation.

## Quickstart

### 1. Install Dependencies

```bash
bun add @fanee/core @fanee/solid # or @fanee/react
bun add -D @fanee/vite @fanee/tools
```

### 2. Configure Vite & Tools

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { fanee } from "@fanee/vite";

export default defineConfig({
	plugins: [
		fanee({ bundlePath: "./locale" }),
	],
});
```

```ts
// fanee.config.ts
import { defineConfig } from "@fanee/tools";

export default defineConfig({
	bundlePath: "locale",
	sourceLocale: "en",
	sources: [
		{ include: ["src/**/*.{ts,tsx}"] },
	],
});
```

### 3. Verify & Check Translations

```bash
# Validate translation keys and message variables
bun run --bun fanee check

# Report translations defined in resources but unreferenced in code
bun run --bun fanee unused
```

## Common Commands

| Command | Description |
|---|---|
| `bun run build` | Build all workspace packages and demo applications |
| `bun run test` | Run unit and integration tests across all packages |
| `bun run typecheck` | Run TypeScript type checks across all packages (`tsgo`) |
| `bun run ci` | Run complete CI verification (Biome format & lint + package CI) |
| `bun run format` | Auto-format all code files across the repository |
| `bun run lint` | Lint all workspace packages |

## License

MIT
