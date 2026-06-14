# AGENTS.md

## Introduction

Fanee is a project that defines and implements a standard for i18n storage.

This repo contains both the OTB (Open Translation Bundle) specification — a new i18n storage format — and its current JavaScript implementation.

## Runtime & toolchain

- Package manager: Bun. Always use `bun` for installing and running scripts.
- Type checker: `@typescript/native-preview` (`tsgo`), not `tsc`. Run per-package via `bun run typecheck`.
- Builder: `tsdown`, not tsup/tsc.
- Formatter/Linter: Biome (`biome.json` at root). Run `bun run format` to format; `bun run lint` for linting.
- Test runner: `bun test`.
- Code style: hard tabs, double quotes, ES5 trailing commas, 100 char line width.

## Project structure

Monorepo with Bun workspaces orchestrated by Turborepo.

`packages/core/`: Core runtime: `FaneeRuntime` class.
`packages/node/`: Node.js filesystem provider that scans OTB bundle directories. Depends on `@fanee/core`.
`spec/README.md`: The OTB (Open Translation Bundle) specification. 

### Common commands

| Purpose | Command |
|---|---|
| Install all | `bun install` |
| Build all | `bun run build` |
| Run tests | `bun run test` |
| Run tests with coverage | `bun run test:coverage` |
| Typecheck all | `bun run typecheck` |
| Lint all | `bun run lint` |
| Format all | `bun run format` |

To run a single package's scripts:
```
bun run --filter @fanee/node test
bun run --filter @fanee/core build
```
