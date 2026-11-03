# @fanee/fs-scanner

Filesystem scanner and resource resolver for the Open Translation Bundle (OTB) format.

## Overview

`@fanee/fs-scanner` inspects directory trees and zip archives adhering to the OTB specification and constructs merged `BundleResources` according to OTB inheritance rules:

1. **Namespace Resolution**: Recursively resolves namespaces from nested `modules/<name>/` paths (e.g. `modules/shop/modules/checkout` resolves to `shop:checkout`).
2. **Descendant Overrides**: Child modules inherit and override messages defined in ancestor modules.
3. **Standalone Modules**: Modules declaring `"standalone": true` in their `manifest.json` do not inherit ancestor data.
4. **Archive Support**: Detects and extracts zip archives on-the-fly to a temporary workspace with automatic cleanup.

## Installation

```bash
bun add @fanee/fs-scanner
# or npm install @fanee/fs-scanner
```

## API

### `scanBundle(bundlePath: string): Promise<BundleResources>`

Scans an OTB bundle directory or zip file and returns the aggregated translation resource map:

```ts
import { scanBundle } from "@fanee/fs-scanner";

const resources = await scanBundle("./i18n");
// {
//   "": { en: { ... }, "zh-CN": { ... } },
//   "shop": { en: { ... }, "zh-CN": { ... } },
//   "shop:checkout": { en: { ... }, "zh-CN": { ... } }
// }
```

### `loadManifest(bundlePath: string): Promise<OTBManifest>`

Reads and validates the root `manifest.json` descriptor. Throws an error if the format is not `"otb"`.

### `isZipArchive(filePath: string): Promise<boolean>`

Checks whether a target file begins with the standard zip header signature (`PK\x03\x04`).

## License

MIT
