![Next-gen i18n solution](.github/assets/banner.png 'Next-gen i18n solution')

Fanee is a project that defines a standard format for storing translations and provides a set of libraries to load, resolve, and format them.

## Specification

[The OTB specification](./spec/README.md) defines a directory structure and metadata format for storing translations resources.

## Packages

- [`@fanee/core`](./packages/core) – Runtime core.
- [`@fanee/node`](./packages/node) – Node.js filesystem provider.
- [`@fanee/react`](./packages/react) – React library.
- [`@fanee/solid`](./packages/solid) – Solid library.
- [`@fanee/vite`](./packages/vite) – Vite bundle plugin.

## Example

See [`apps/example-react`](./apps/example-react) for a Vite + React demo.

See [`apps/example-solid`](./apps/example-solid/) for a Vite + SolidJS demo.

## License

MIT
