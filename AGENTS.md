# AGENTS.md - Guide for AI Agents Working with Actual Budget

This guide provides comprehensive information for AI agents (like Cursor) working with the Actual Budget codebase.

## Project Overview

**Actual Budget** is a local-first personal finance tool written in TypeScript/JavaScript. It's 100% free and open-source with synchronization capabilities across devices.

- **Repository**: https://github.com/actualbudget/actual
- **Community Docs**: Documentation is part of the monorepo at `packages/docs/`. Published at https://actualbudget.org/docs
- **License**: MIT
- **Primary Language**: TypeScript (with React)
- **Build System**: Yarn 4 workspaces (monorepo)

## Quick Start Commands

### Essential Commands (Run from Root)

```bash
# Type checking (ALWAYS run before committing)
yarn typecheck

# Linting and formatting (with auto-fix)
yarn lint:fix

# Run all tests
yarn test

# Start development server (browser)
yarn start

# Start with sync server
yarn start:server-dev

# Start desktop app development
yarn start:desktop
```

### Important Rules

- **ALWAYS run yarn commands from the root directory** - never run them in child workspaces
- Use `yarn workspace <workspace-name> run <command>` for workspace-specific tasks
- Tests run once and exit by default (using `vitest --run`)

### ⚠️ PR titles must start with `[AI]`

Every pull request title must be prefixed with `[AI]` — nothing checks this for
you. See [PR and Commit Rules](.github/agents/pr-and-commit-rules.md).

### Task Orchestration with Lage

The project uses **[lage](https://microsoft.github.io/lage/)** (a task runner for JavaScript monorepos) to efficiently run tests and other tasks across multiple workspaces:

- **Parallel execution**: Runs tests in parallel across workspaces for faster feedback
- **Smart caching**: Caches test results to skip unchanged packages (cached in `.lage/` directory)
- **Dependency awareness**: Understands workspace dependencies and execution order
- **Continues on error**: Uses `--continue` flag to run all packages even if one fails

**Lage Commands:**

```bash
# Run all tests across all packages
yarn test                    # Equivalent to: lage test --continue

# Run tests without cache (for debugging/CI)
yarn test:debug              # Equivalent to: lage test --no-cache --continue
```

Configuration is in `lage.config.js` at the project root.

## Architecture & Package Structure

### Core Packages

#### 1. **loot-core** (`packages/loot-core/`)

The core application logic that runs on any platform.

- Business logic, database operations, and calculations
- Platform-agnostic code
- Exports for both browser and node environments
- Test commands:

  ```bash
  # Run all loot-core tests
  yarn workspace @actual-app/core run test

  # Or run tests across all packages using lage
  yarn test
  ```

#### 2. **desktop-client** (`packages/desktop-client/` - aliased as `@actual-app/web`)

The React-based UI for web and desktop.

- React components using functional programming patterns
- E2E tests using Playwright
- Vite for bundling
- Commands:

  ```bash
  # Development
  yarn workspace @actual-app/web start:browser

  # Build
  yarn workspace @actual-app/web build

  # E2E tests
  yarn workspace @actual-app/web e2e

  # Visual regression tests
  yarn workspace @actual-app/web vrt
  ```

#### 3. **desktop-electron** (`packages/desktop-electron/`)

Electron wrapper for the desktop application.

- Window management and native OS integration
- E2E tests for Electron-specific features

#### 4. **api** (`packages/api/` - aliased as `@actual-app/api`)

Public API for programmatic access to Actual.

- Node.js API
- Designed for integrations and automation
- Commands:

  ```bash
  # Build
  yarn workspace @actual-app/api build

  # Run tests
  yarn workspace @actual-app/api test

  # Or use lage to run all tests
  yarn test
  ```

#### 5. **sync-server** (`packages/sync-server/` - aliased as `@actual-app/sync-server`)

Synchronization server for multi-device support.

- Express-based server
- Currently transitioning to TypeScript (mostly JavaScript)
- Commands:
  ```bash
  yarn workspace @actual-app/sync-server start
  ```

#### 6. **component-library** (`packages/component-library/` - aliased as `@actual-app/components`)

Reusable React UI components.

- Shared components like Button, Input, Menu, etc.
- Theme system and design tokens
- Icons (375+ icons in SVG/TSX format)

#### 7. **crdt** (`packages/crdt/` - aliased as `@actual-app/crdt`)

CRDT (Conflict-free Replicated Data Type) implementation for data synchronization.

- Protocol buffers for serialization
- Core sync logic

#### 8. **plugins-service** (`packages/plugins-service/`)

Service for handling plugins/extensions.

#### 9. **eslint-plugin-actual** (`packages/eslint-plugin-actual/`)

Custom ESLint rules specific to Actual.

- `no-untranslated-strings`: Enforces i18n usage
- `prefer-trans-over-t`: Prefers Trans component over t() function
- `prefer-logger-over-console`: Enforces using logger instead of console in `packages/loot-core/`
- `typography`: Typography rules
- `prefer-if-statement`: Prefers explicit if statements

#### 10. **docs** (`packages/docs/`)

Documentation website built with Docusaurus.

- Documentation is part of the monorepo
- Built with Docusaurus 3
- Commands:
  ```bash
  yarn workspace docs start
  yarn workspace docs build
  yarn start:docs  # From root
  ```

## Development Workflow

### 1. Making Changes

When implementing changes:

1. Read relevant files to understand current implementation
2. Make focused, incremental changes

### 2. Testing Strategy

**Unit Tests (Vitest)**

The project uses **lage** for running tests across all workspaces efficiently.

```bash
# Run all tests across all packages (using lage)
yarn test

# Run tests without cache (for debugging)
yarn test:debug

# Run tests for a specific package
yarn workspace @actual-app/core run test
```

**E2E Tests (Playwright)**

```bash
# Run E2E tests for web
yarn e2e

# Desktop Electron E2E (includes full build)
yarn e2e:desktop

# Visual regression tests
yarn vrt

# Visual regression in Docker (consistent environment)
yarn vrt:docker

# Run E2E tests for a specific package
yarn workspace @actual-app/web e2e
```

**Testing Best Practices:**

- Minimize mocked dependencies - prefer real implementations
- Use descriptive test names
- Vitest globals are available: `describe`, `it`, `expect`, `beforeEach`, etc.
- For sync-server tests, globals are explicitly defined in config

### 3. Type Checking

TypeScript configuration uses:

- Incremental compilation
- Strict type checking with `typescript-strict-plugin`. New files must be
  type-strict — don't add `// @ts-strict-ignore` to a new file (existing files
  are grandfathered).
- Platform-specific exports in `loot-core` (node vs browser)

### 4. Internationalization (i18n)

Use the `Trans` component (and translated strings) for user-facing text.
Regenerate i18n files with `yarn generate:i18n`.

### 5. Financial Number Typography

Wrap standalone financial numbers with `FinancialText` (or `styles.tnum` where
wrapping isn't possible).

## Code Style & Conventions

### TypeScript Guidelines

**Type Usage:**

- Use TypeScript for all code; look for existing type definitions before adding new ones
- Prefer `satisfies` over type assertions (`as`, `!`) for narrowing

**Naming:**

- Use descriptive variable names with auxiliary verbs (e.g., `isLoaded`, `hasError`)

**Code Structure:**

- Functional and declarative programming patterns - avoid classes
- Use the `function` keyword for pure functions
- Prefer iteration and modularization over code duplication
- Structure files: exported component/page, helpers, static content, types
- Create new components in their own files

**React Patterns:**

- The project uses **React Compiler** (`babel-plugin-react-compiler`) in the desktop-client. The compiler auto-memoizes component bodies, so you can omit manual `useCallback`, `useMemo`, and `React.memo` when adding or refactoring code; prefer inline callbacks and values unless a stable identity is required by a non-compiled dependency.
- Avoid unstable nested components

**JSX Style:**

- Declarative JSX, minimal and readable
- Avoid unnecessary curly braces in conditionals
- Use concise syntax for simple statements
- Prefer explicit expressions (`condition && <Component />`)

### Platform-Specific Code

- Use conditional exports in `loot-core` for platform-specific code; platform
  resolution happens at build time via package.json exports. Don't directly
  import another platform's modules (`.api`, `.electron`).

For commit and PR rules, see
[PR and Commit Rules](.github/agents/pr-and-commit-rules.md).

## File Structure Patterns

### Typical Component File

```typescript
import { type ComponentType } from 'react';
// ... other imports

type MyComponentProps = {
  // Props definition
};

export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### Test File

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
// ... imports

describe('ComponentName', () => {
  it('should behave as expected', () => {
    // Test logic
    expect(result).toBe(expected);
  });
});
```

## Important Directories & Files

### Configuration Files

- `/package.json` - Root workspace configuration, scripts
- `/lage.config.js` - Lage task runner configuration
- `/.oxlintrc.json` - Lint rules (oxlint); `/.oxfmtrc.json` - formatting (oxfmt)
- `/.nano-staged.json` - pre-commit format/lint config (run via Husky)
- `/.claude/settings.json`, `/.codex/config.toml`, `/.cursor/hooks.json` - agent
  hook wiring; shared scripts live in `/scripts/agent-hooks/`
- `/tsconfig.json` - Root TypeScript configuration
- `/.cursorignore`, `/.gitignore` - Ignored files
- `/yarn.lock` - Dependency lockfile (Yarn 4)

### Documentation

- `/README.md` - Project overview
- `/CONTRIBUTING.md` - Points to community docs
- `/upcoming-release-notes/` - Release notes for next version
- `/CODEOWNERS` - Code ownership definitions
- `/packages/docs/` - Documentation website (Docusaurus)

### Build Artifacts (Don't Edit)

- `packages/*/lib-dist/` - Built output
- `packages/*/dist/` - Built output
- `packages/*/build/` - Built output
- `packages/desktop-client/playwright-report/` - Test reports
- `packages/desktop-client/test-results/` - Test results
- `.lage/` - Lage task runner cache (improves test performance)

### Key Source Directories

- `packages/loot-core/src/client/` - Client-side core logic
- `packages/loot-core/src/server/` - Server-side core logic
- `packages/loot-core/src/shared/` - Shared utilities
- `packages/loot-core/src/types/` - Type definitions
- `packages/desktop-client/src/components/` - React components
- `packages/desktop-client/src/hooks/` - Custom React hooks
- `packages/desktop-client/e2e/` - End-to-end tests
- `packages/component-library/src/` - Reusable components
- `packages/component-library/src/icons/` - Icon components (auto-generated, don't edit)
- `packages/docs/docs/` - Documentation source files (Markdown)
- `packages/docs/docs/contributing/` - Developer documentation

## Common Development Tasks

### Running Specific Tests

```bash
# Run all tests across all packages (recommended)
yarn test

# E2E test for a specific file
yarn workspace @actual-app/web run playwright test accounts.test.ts --browser=chromium
```

### Building for Production

```bash
# Browser build
yarn build:browser

# Desktop build
yarn build:desktop

# API build
yarn build:api

# Sync server build
yarn build:server
```

### Type Checking Specific Packages

TypeScript uses project references. Run `yarn typecheck` from root to check all packages.

### Debugging Tests

```bash
# Run tests in debug mode (without parallelization)
yarn test:debug

# Run specific E2E test with headed browser
yarn workspace @actual-app/web run playwright test --headed --debug accounts.test.ts
```

### Working with Icons

Icons in `packages/component-library/src/icons/` are auto-generated. Don't manually edit them.

## Troubleshooting

### Type Errors

1. Run `yarn typecheck` to see all type errors
2. Check if types are imported correctly
3. Look for existing type definitions in `packages/loot-core/src/types/`
4. Use `satisfies` instead of `as` for type narrowing

### Linter Errors

Run `yarn lint` to check. All rules — including the custom `actual/*` rules
(`no-untranslated-strings`, `prefer-trans-over-t`, `prefer-logger-over-console`,
`typography`, …) — are defined in [`.oxlintrc.json`](.oxlintrc.json).

### Test Failures

1. Check if test is running in correct environment (node vs web)
2. For Vitest: check `vitest.config.ts` or `vitest.web.config.ts`
3. For Playwright: check `playwright.config.ts`
4. Ensure mock minimization - prefer real implementations
5. **Lage cache issues**: Clear cache with `rm -rf .lage` if tests behave unexpectedly
6. **Tests continue on error**: With `--continue` flag, all packages run even if one fails

### Import Resolution Issues

1. Check `tsconfig.json` for path mappings
2. Check package.json `exports` field (especially for loot-core)
3. Verify platform-specific imports (`.electron`, `.api`)
4. Use absolute imports in `desktop-client`

### Build Failures

1. Clean build artifacts: `rm -rf packages/*/dist packages/*/lib-dist packages/*/build`
2. Reinstall dependencies: `yarn install`
3. Check Node.js version (requires >=22)
4. Check Yarn version (requires ^4.9.1)

## Testing Patterns

### Unit Tests

- Located alongside source files or in `__tests__` directories
- Use `.test.ts`, `.test.tsx`, `.spec.js` extensions
- Vitest is the test runner
- Minimize mocking - prefer real implementations

### E2E Tests

- Located in `packages/desktop-client/e2e/`
- Use Playwright test runner
- Visual regression snapshots in `*-snapshots/` directories
- Page models in `e2e/page-models/` for reusable page interactions
- Mobile tests have `.mobile.test.ts` suffix

### Visual Regression Tests (VRT)

- Snapshots stored per test file in `*-snapshots/` directories
- Use Docker for consistent environment: `yarn vrt:docker`

## Additional Resources

- **Community Documentation**: https://actualbudget.org/docs/contributing/
- **Discord Community**: https://discord.gg/pRYNYr4W5A
- **GitHub Issues**: https://github.com/actualbudget/actual/issues
- **Feature Requests**: Label "needs votes" sorted by reactions

## Code Quality Checklist

Before committing changes, ensure:

- [ ] Commit and PR rules followed (see [PR and Commit Rules](.github/agents/pr-and-commit-rules.md))
- [ ] Platform-specific code uses proper exports

## Pull Request Guidelines

See [PR and Commit Rules](.github/agents/pr-and-commit-rules.md) for complete PR creation rules, including title prefix requirements, labeling, and PR template handling.

## Code Review Guidelines

When performing code reviews (especially for LLM agents): **see [CODE_REVIEW_GUIDELINES.md](./CODE_REVIEW_GUIDELINES.md)** for specific guidelines.

## Performance Considerations

- **Bundle Size**: Check with rollup-plugin-visualizer
- **Type Checking**: Uses incremental compilation
- **Testing**: Tests run in parallel by default
- **Linting**: ESLint caches results for faster subsequent runs

## Workspace Commands Reference

```bash
# List all workspaces
yarn workspaces list

# Run command in specific workspace
yarn workspace <workspace-name> run <command>

# Run command in all workspaces
yarn workspaces foreach --all run <command>

# Install production dependencies only (for server deployment)
yarn install:server
```

## Environment Requirements

- **Node.js**: >=22
- **Yarn**: ^4.9.1 (managed by packageManager field)
- **Browser Targets**: Electron >= 35.0, modern browsers (see browserslist)

## Migration Notes

The codebase is actively being migrated:

- **JavaScript → TypeScript**: sync-server is in progress
- **Classes → Functions**: Prefer functional patterns
- **React.\* → Named Imports**: Legacy React.\* patterns being removed

When working with older code, follow the newer patterns described in this guide.

## Cursor Cloud specific instructions

### Services overview

| Service             | Command                 | Port | Required                      |
| ------------------- | ----------------------- | ---- | ----------------------------- |
| Web Frontend (Vite) | `yarn start`            | 3001 | Yes                           |
| Sync Server         | `yarn start:server-dev` | 5006 | Optional (sync features only) |

All storage is **SQLite** (file-based via `better-sqlite3`). No external databases or services are needed.

### Running the app

- `yarn start` builds the plugins-service worker, loot-core browser backend, and starts the Vite dev server on port **3001**.
- `yarn start:server-dev` starts both the sync server (port 5006) and the web frontend together.
- The Vite HMR dev server serves many unbundled modules. In constrained environments, the browser may hit `ERR_INSUFFICIENT_RESOURCES`. If that happens, use `yarn build:browser` followed by serving the built output from `packages/desktop-client/build/` with proper COOP/COEP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`).

### Lint, test, typecheck

Standard commands documented in `package.json` scripts and the Quick Start section above:

- `yarn lint` / `yarn lint:fix` (uses oxlint + oxfmt)
- `yarn test` (lage across all workspaces)
- `yarn typecheck` (tsgo + lage typecheck)

### Testing and previewing the app

When running the app for manual testing or demos, use **"View demo"** on the initial setup screen (after selecting "Don't use a server"). This creates a test budget pre-populated with realistic sample data (accounts, transactions, categories, and budgeted amounts), which is far more useful than starting with an empty budget.

### Gotchas

- The `engines` field requires **Node.js >=22** and **Yarn ^4.9.1**. The `.nvmrc` specifies `v22/*`.
- Pre-commit hook runs `nano-staged` (oxfmt + oxlint, configured in `.nano-staged.json`) via Husky. Run `yarn prepare` once after install to set up hooks.
- Lage caches test results in `.lage/`. If tests behave unexpectedly, clear with `rm -rf .lage`.
- Native modules (`better-sqlite3`, `bcrypt`) require build tools (`gcc`, `make`, `python3`). These are pre-installed in the Cloud VM.
- All yarn commands must be run from the repository root, never from child workspaces.
