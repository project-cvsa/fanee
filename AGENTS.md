# System Prompt & Guide for AI Agents

## 1. System Context
Project: Fanee
Repository Type: Monorepo (Turborepo + Bun Workspaces)
Tech Stack: Bun, TypeScript (`@typescript/native-preview` / `tsgo`), Biome, tsdown, SolidJS, React, Vite

### Workspace Structure
- `packages/core`: Core runtime (`FaneeRuntime`), state management, MF2 MessageFormat formatting
- `packages/fs-scanner`: Filesystem and zip archive bundle scanner (OTB inheritance and standalone rules)
- `packages/node`: Node.js filesystem provider plugin for `@fanee/core`
- `packages/vite`: Vite plugin for `virtual:fanee` module resolution with CSR and SSR HMR
- `packages/react`: React bindings (`FaneeProvider`, `useT`, `useLocale`, `useSetLocale`, `useFanee`)
- `packages/solid`: SolidJS bindings with fine-grained reactivity (`FaneeProvider`, `useT`, `useLocale`)
- `packages/tools`: Translation CLI (`fanee check`, `fanee unused`, `fanee types`), AST code scanner, and typegen
- `apps/example-react`: Vite + React example application
- `apps/example-solid`: Vite + SolidJS example application
- `spec/`: Open Translation Bundle (OTB) specification

## 2. Pragmatic Engineering & Anti-Defensiveness

### 1. No Jargon Theater & Phantom Disclaimers
- Strictly avoid pseudo-rigorous corporate jargon and audit theatre in communication, docs, and pull requests.
- Address only the explicit scope requested.
- State what the system does and its verified limits plainly; do not write CYA contracts or legalistic disclaimers.

### 2. No Paranoid Defensive Coding
- Trust system boundaries: Validate inputs strictly at runtime boundaries (CLI edge, schema parsing).
- Inside the application domain, trust TypeScript's type system.
- Do not write redundant null/undefined checks, fallback defaults, or type guards on data already validated upstream.
- Do not wrap internal logic in catch-all try-catch blocks that silently swallow errors or return arbitrary fallbacks.

### 3. Testing Principles
- Test public behavior, not implementation details: Tests should interact exclusively through public APIs or protocol interfaces, asserting on returned values, emitted state, or exit codes.
- Deterministic and zero-flakiness: Never rely on fragile real-time timeouts or uncoordinated races.
- Meaningful contracts: Test descriptions must clearly describe the scenario and expected outcome.

### 4. Documentation & Copy Style
- Good documentation respects the reader's time: Direct and factual prose. Zero AI filler or marketing language (*seamless, robust, powerful, production-grade*).
- Minimal UI and CLI copy: Keep command output, status messages, and diagnostics clean, actionable, and free of unnecessary noise.

## 3. Toolchain & Execution Commands

Always use `bun` as the package manager and test runner.

### Pre-PR Verification
Before pushing or creating a PR, run this exact sequence to ensure CI will pass on the first attempt:
```bash
bun run ci             # Biome lint & format verification across monorepo + package CI
bun run typecheck      # Typecheck all workspace packages (tsgo)
bun run test           # Run all unit and integration tests
```

### Common Commands
```bash
bun run build          # Build all workspace packages and demo applications
bun run format         # Auto-format all files via Biome
bun run lint           # Run Biome linter across the repository
bun run test:coverage  # Run all tests with coverage
```

## 4. Version Control (Jujutsu / Git)
- Prefer `jj` (Jujutsu) over `git` when available. Always pass `--no-pager` to avoid hanging non-interactive shells.
- Never mix changes into existing dirty work without user instruction.
- Conventional commits format: `<type>(optional scope): <description>`.
