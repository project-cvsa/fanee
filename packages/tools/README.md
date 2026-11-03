# @fanee/tools

Translation toolchain, CLI, and AST scanner for the Open Translation Bundle (OTB) ecosystem.

## Features

- **Resource Validation**: Verifies JSON syntax, duplicate keys, missing locale resources, and MessageFormat 2 (MF2) interpolation variable parity.
- **AST Code Scanner**: Parses TypeScript/JavaScript code using the TypeScript compiler API to extract translation calls, track scoped namespace bindings, and detect dynamic/unresolved keys.
- **Unused Translation Detection**: Identifies messages defined in the source locale that are never referenced across the codebase.
- **Type Generation**: Generates strongly-typed TypeScript definitions for message keys and required interpolation parameters.

## CLI Usage

Install as a dev dependency:

```bash
bun add -D @fanee/tools
# or npm install -D @fanee/tools
```

Run the CLI:

```bash
bun run --bun fanee <command> [options]
# or npx fanee <command> [options]
```

### Commands

| Command | Description |
|---|---|
| `fanee check` | Verify translation resources and code references against configured sources (default). |
| `fanee unused` | List source translations defined in bundle files but unreferenced in code. |
| `fanee types --output <path>` | Generate TypeScript interfaces for all namespaces and message keys. |
| `fanee init` | Scaffold a starter `fanee.config.ts` in the current directory. |

### Global Options

- `-c, --config <path>`: Path to configuration file (default: `fanee.config.ts`).
- `-v, --version`: Show CLI version.
- `-h, --help`: Show command help.

### `fanee check` Options

- `--unused`: Fail with exit code 1 if any unused source translations exist.
- `--json`: Output diagnostics and analysis summary as JSON.

### `fanee unused` Options

- `--json`: Output array of unused message entries as JSON.

## Configuration

Create `fanee.config.ts` in your project root:

```ts
import { defineConfig } from "@fanee/tools";

export default defineConfig({
	// Path to the OTB bundle directory containing manifest.json and messages/
	bundlePath: "locale",

	// Default source locale used for variable consistency comparisons
	sourceLocale: "en",

	// Severity when a message is missing translations in target locales ("warning" | "error")
	missingTranslations: "warning",

	// Source code globs and translation extraction rules
	sources: [
		{
			include: ["src/**/*.{ts,tsx}"],

			// Custom translation hook or factory bindings
			factories: [
				{ name: "useT" },
				{ name: "*.getT" },
				{ name: "getComponentT", baseNamespace: "web:client", argument: "namespace" },
			],

			// Direct function namespace mappings
			functions: {
				"i18n.t": "common",
			},

			// Default namespace for unqualified t() calls in this source group
			namespace: "web",
		},
	],
});
```

### Source Transforms (e.g. Astro / Vue / Svelte)

You can pass a custom `transform` function to preprocess non-standard source files before AST analysis:

```ts
import { transform } from "@astrojs/compiler-rs";
import { defineConfig } from "@fanee/tools";

export default defineConfig({
	bundlePath: "locale",
	sourceLocale: "en",
	sources: [
		{
			include: ["src/**/*.astro"],
			transform: (code, filename) => transform(code, { filename }).code,
		},
	],
});
```

## Programmatic API

```ts
import { analyze, generateTypes, defineConfig } from "@fanee/tools";

const analysis = await analyze(config, process.cwd());

console.log(analysis.diagnostics);
console.log(analysis.unused);

const tsTypes = generateTypes(analysis);
```

## License

MIT
