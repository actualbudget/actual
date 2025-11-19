---
title: Testing
---

Actual uses a comprehensive testing strategy to ensure code quality and reliability. This guide covers how to run tests, write tests, and debug test failures.

## Testing Overview

The project uses multiple testing frameworks:

- **Vitest** - Unit testing framework
- **Playwright** - End-to-end (E2E) testing
- **Lage** - Task runner for running tests across the monorepo efficiently

## Running Tests

### Running All Tests

```bash
# Run all tests across all packages (recommended)
yarn test

# Run tests without cache (for debugging/CI)
yarn test:debug
```

The `yarn test` command uses Lage to run tests in parallel across all workspaces. This provides:

- **Parallel execution**: Tests run simultaneously across packages for faster feedback
- **Smart caching**: Test results are cached in `.lage/` directory to skip unchanged packages
- **Dependency awareness**: Understands workspace dependencies and execution order

### Running Tests for a Specific Package

```bash
# Run tests for loot-core
yarn workspace loot-core run test

# Run tests for the API package
yarn workspace @actual-app/api run test

# Run tests for desktop-client
yarn workspace @actual-app/web run test
```

### Running a Specific Test File

```bash
# Run E2E test for a specific file
yarn workspace @actual-app/web run playwright test accounts.test.ts
```

## Unit Tests (Vitest)

Unit tests are located alongside source files or in `__tests__` directories. Test files use the following naming conventions:

- `.test.ts` - TypeScript test files
- `.test.tsx` - React component test files
- `.spec.js` - JavaScript test files (legacy)

### Writing Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
// ... other imports

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup code
  });

  it('should behave as expected', () => {
    // Test logic
    expect(result).toBe(expected);
  });
});
```

### Testing Best Practices

- **Minimize mocking**: Prefer real implementations over mocks when possible
- **Use descriptive test names**: Test names should clearly describe what is being tested
- **Vitest globals**: `describe`, `it`, `expect`, `beforeEach`, etc. are available globally
- **Sync-server tests**: For sync-server tests, globals are explicitly defined in config

## End-to-End Tests (Playwright)

E2E tests are located in `packages/desktop-client/e2e/` and use Playwright as the test runner.

### Running E2E Tests

```bash
# Run E2E tests for web
yarn e2e

# Desktop Electron E2E (includes full build)
yarn e2e:desktop

# Run E2E tests for a specific package
yarn workspace @actual-app/web e2e

# Run specific E2E test with headed browser
yarn workspace @actual-app/web run playwright test --headed --debug accounts.test.ts
```

### E2E Test Structure

- Tests are located in `packages/desktop-client/e2e/`
- Page models are in `e2e/page-models/` for reusable page interactions
- Mobile tests have `.mobile.test.ts` suffix

## Visual Regression Tests (VRT)

Visual regression tests capture screenshots and compare them to baseline images to detect visual changes.

```bash
# Run visual regression tests
yarn vrt

# Run visual regression tests in Docker (consistent environment)
yarn vrt:docker
```

Visual regression snapshots are stored per test file in `*-snapshots/` directories. Use Docker for consistent environments when running VRT. They will be automatically generated and run on pull requests to catch unexpected visual changes.

## Debugging Test Failures

### Lage Cache Issues

If tests behave unexpectedly, the Lage cache might be causing issues:

```bash
# Clear Lage cache
rm -rf .lage

# Run tests without cache
yarn test:debug
```

### Tests Continue on Error

With the `--continue` flag, all packages run even if one fails. This helps identify all test failures across the monorepo in a single run.

### Debug Mode

```bash
# Run tests in debug mode (without parallelization)
yarn test:debug

# Run specific E2E test with headed browser and debug mode
yarn workspace @actual-app/web run playwright test --headed --debug accounts.test.ts
```

## Test Configuration

### Vitest Configuration

- Root config: `vitest.config.ts` (for node environment)
- Web config: `vitest.web.config.ts` (for browser environment)
- Sync-server tests have globals explicitly defined in config

### Playwright Configuration

- Config file: `packages/desktop-client/playwright.config.ts`
- Test reports: `packages/desktop-client/playwright-report/`
- Test results: `packages/desktop-client/test-results/`

## Testing Checklist

Before submitting a pull request:

- [ ] All existing tests pass (`yarn test`)
- [ ] New functionality has appropriate test coverage
- [ ] Tests follow best practices (minimize mocking, descriptive names)
- [ ] E2E tests pass if UI changes were made

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Lage Documentation](https://microsoft.github.io/lage/)
