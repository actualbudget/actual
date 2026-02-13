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

### ⚠️ CRITICAL REQUIREMENT: AI-Generated Commit Messages and PR Titles

**THIS IS A MANDATORY REQUIREMENT THAT MUST BE FOLLOWED WITHOUT EXCEPTION:**

- **ALL commit messages MUST be prefixed with `[AI]`**
- **ALL pull request titles MUST be prefixed with `[AI]`**

**Examples:**

- ✅ `[AI] Fix type error in account validation`
- ✅ `[AI] Add support for new transaction categories`
- ❌ `Fix type error in account validation` (MISSING PREFIX - NOT ALLOWED)
- ❌ `Add support for new transaction categories` (MISSING PREFIX - NOT ALLOWED)

**This requirement applies to:**

- Every single commit message created by AI agents
- Every single pull request title created by AI agents
- No exceptions are permitted

**This is a hard requirement that agents MUST follow. Failure to include the `[AI]` prefix is a violation of these instructions.**

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
  yarn workspace loot-core run test

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
3. Run type checking: `yarn typecheck`
4. Run linting: `yarn lint:fix`
5. Run relevant tests
6. Fix any linter errors that are introduced

### 2. Testing Strategy

**Unit Tests (Vitest)**

The project uses **lage** for running tests across all workspaces efficiently.

```bash
# Run all tests across all packages (using lage)
yarn test

# Run tests without cache (for debugging)
yarn test:debug

# Run tests for a specific package
yarn workspace loot-core run test
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
- Strict type checking with `typescript-strict-plugin`
- Platform-specific exports in `loot-core` (node vs browser)

Always run `yarn typecheck` before committing.

### 4. Internationalization (i18n)

- Use `Trans` component instead of `t()` function when possible
- All user-facing strings must be translated
- Generate i18n files: `yarn generate:i18n`
- Custom ESLint rules enforce translation usage

### 5. Financial Number Typography

- Wrap standalone financial numbers with `FinancialText` or apply `styles.tnum` directly if wrapping is not possible

## Code Style & Conventions

### TypeScript Guidelines

**Type Usage:**

- Use TypeScript for all code
- Prefer `type` over `interface`
- Avoid `enum` - use objects or maps
- Avoid `any` or `unknown` unless absolutely necessary
- Look for existing type definitions in the codebase
- Avoid type assertions (`as`, `!`) - prefer `satisfies`
- Use inline type imports: `import { type MyType } from '...'`

**Naming:**

- Use descriptive variable names with auxiliary verbs (e.g., `isLoaded`, `hasError`)
- Named exports for components and utilities (avoid default exports except in specific cases)

**Code Structure:**

- Functional and declarative programming patterns - avoid classes
- Use the `function` keyword for pure functions
- Prefer iteration and modularization over code duplication
- Structure files: exported component/page, helpers, static content, types
- Create new components in their own files

**React Patterns:**

- Don't use `React.FunctionComponent` or `React.FC` - type props directly
- Don't use `React.*` patterns - use named imports instead
- Use `<Link>` instead of `<a>` tags
- Use custom hooks from `src/hooks` (not react-router directly):
  - `useNavigate()` from `src/hooks` (not react-router)
  - `useDispatch()`, `useSelector()`, `useStore()` from `src/redux` (not react-redux)
- Avoid unstable nested components
- Use `satisfies` for type narrowing

**JSX Style:**

- Declarative JSX, minimal and readable
- Avoid unnecessary curly braces in conditionals
- Use concise syntax for simple statements
- Prefer explicit expressions (`condition && <Component />`)

### Import Organization

Imports are automatically organized by ESLint with the following order:

1. React imports (first)
2. Built-in Node.js modules
3. External packages
4. Actual packages (`loot-core`, `@actual-app/components` - legacy pattern `loot-design` may appear in old code)
5. Parent imports
6. Sibling imports
7. Index imports

Always maintain newlines between import groups.

### Platform-Specific Code

- Don't directly reference platform-specific imports (`.api`, `.web`, `.electron`)
- Use conditional exports in `loot-core` for platform-specific code
- Platform resolution happens at build time via package.json exports

### Restricted Patterns

**Never:**

- Import from `uuid` without destructuring: use `import { v4 as uuidv4 } from 'uuid'`
- Import colors directly - use theme instead
- Import `@actual-app/web/*` in `loot-core`

**Git Commands:**

- **MANDATORY: ALL commit messages MUST be prefixed with `[AI]`** - This is a hard requirement with no exceptions
- **MANDATORY: ALL pull request titles MUST be prefixed with `[AI]`** - This is a hard requirement with no exceptions
- Never update git config
- Never run destructive git operations (force push, hard reset) unless explicitly requested
- Never skip hooks (--no-verify, --no-gpg-sign)
- Never force push to main/master
- Never commit unless explicitly asked

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
- `/eslint.config.mjs` - ESLint configuration (flat config format)
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

1. Run `yarn lint:fix` to auto-fix many issues
2. Check ESLint output for specific rule violations
3. Custom rules:
   - `actual/no-untranslated-strings` - Add i18n
   - `actual/prefer-trans-over-t` - Use Trans component
   - `actual/prefer-logger-over-console` - Use logger
   - Check `eslint.config.mjs` for complete rules

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
3. Verify platform-specific imports (`.web`, `.electron`, `.api`)
4. Use absolute imports in `desktop-client` (enforced by ESLint)

### Build Failures

1. Clean build artifacts: `rm -rf packages/*/dist packages/*/lib-dist packages/*/build`
2. Reinstall dependencies: `yarn install`
3. Check Node.js version (requires >=20)
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

- [ ] **MANDATORY: Commit message is prefixed with `[AI]`** - This is a hard requirement with no exceptions
- [ ] `yarn typecheck` passes
- [ ] `yarn lint:fix` has been run
- [ ] Relevant tests pass
- [ ] User-facing strings are translated
- [ ] Prefer `type` over `interface`
- [ ] Named exports used (not default exports)
- [ ] Imports are properly ordered
- [ ] Platform-specific code uses proper exports
- [ ] No unnecessary type assertions

## Pull Request Guidelines

When creating pull requests:

- **MANDATORY PREFIX REQUIREMENT**: **ALL pull request titles MUST be prefixed with `[AI]`** - This is a hard requirement that MUST be followed without exception
  - ✅ Correct: `[AI] Fix type error in account validation`
  - ❌ Incorrect: `Fix type error in account validation` (MISSING PREFIX - NOT ALLOWED)
- **AI-Generated PRs**: If you create a PR using AI assistance, add the **"AI generated"** label to the pull request. This helps maintainers understand the nature of the contribution.

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

- **Node.js**: >=20
- **Yarn**: ^4.9.1 (managed by packageManager field)
- **Browser Targets**: Electron >= 35.0, modern browsers (see browserslist)

## Migration Notes

The codebase is actively being migrated:

- **JavaScript → TypeScript**: sync-server is in progress
- **Classes → Functions**: Prefer functional patterns
- **React.\* → Named Imports**: Legacy React.\* patterns being removed

When working with older code, follow the newer patterns described in this guide.
