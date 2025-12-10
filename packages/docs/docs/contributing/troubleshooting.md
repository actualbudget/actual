---
title: Troubleshooting
---

This guide helps you resolve common issues when developing for Actual.

## Type Errors

### Issue: TypeScript compilation errors

**Solution:**

1. Run `yarn typecheck` to see all type errors
2. Check if types are imported correctly
3. Look for existing type definitions in `packages/loot-core/src/types/`
4. Use `satisfies` instead of `as` for type narrowing

### Issue: Cannot find module or type definitions

**Solution:**

1. Check `tsconfig.json` for path mappings
2. Ensure you're using the correct import path for the package
3. Run `yarn install` to ensure all dependencies are installed

## Linter Errors

### Issue: ESLint or Prettier errors

**Solution:**

1. Run `yarn lint:fix` to auto-fix many issues
2. Check ESLint output for specific rule violations and fix them

## Test Failures

### Issue: Tests fail unexpectedly

**Solution:**

1. Check if test is running in correct environment (node vs web)
2. **Lage cache issues**: Clear cache with `rm -rf .lage` if tests behave unexpectedly

### Issue: E2E tests fail

**Solution:**

1. Ensure Playwright browsers are installed: `yarn workspace @actual-app/web run playwright install`
2. Run tests with headed browser for debugging: `yarn workspace @actual-app/web run playwright test --headed --debug`

## Import Resolution Issues

### Issue: Platform-specific import errors

**Solution:**

- Don't directly reference platform-specific imports (`.api`, `.web`, `.electron`)
- Use conditional exports in `loot-core` for platform-specific code

## Build Failures

### Issue: Build fails with errors

**Solution:**

1. Clean build artifacts:
   ```bash
   rm -rf packages/*/dist packages/*/lib-dist packages/*/build
   ```
2. Reinstall dependencies:
   ```bash
   yarn install
   ```
3. Check Node.js version (requires >=22):
   ```bash
   node --version
   ```
4. Check Yarn version (requires ^4.9.1):
   ```bash
   yarn --version
   ```

### Issue: Native module build failures (better-sqlite3)

**Solution:**

1. On Windows: Ensure you selected "Automatically install the necessary tools" during Node.js installation
2. Run `yarn rebuild-electron` for Electron builds
3. Run `yarn workspace loot-core rebuild` for Node.js builds
4. Ensure you have the necessary build tools installed (Python, Visual Studio Build Tools on Windows)

## Development Server Issues

### Issue: Development server won't start

**Solution:**

1. Check if port is already in use
2. Ensure all dependencies are installed: `yarn install`
3. Try clearing node_modules and reinstalling:
   ```bash
   rm -rf node_modules packages/**/node_modules
   yarn install
   ```
4. Check for error messages in the console

### Issue: Hot reload not working

**Solution:**

1. Ensure you're running the correct development command
2. Check if file watchers are working (may be limited on some systems)
3. Try restarting the development server
4. Check for file system permission issues

## Workspace Command Issues

### Issue: Workspace command not found

**Solution:**

1. Ensure you're running commands from the root directory
2. Verify workspace name is correct: `yarn workspaces list`
3. Check package.json for available scripts
4. Use correct workspace alias (e.g., `@actual-app/web` instead of `desktop-client`)

## Git Issues

### Issue: Pre-commit hooks failing

**Solution:**

1. Ensure Husky is set up: `yarn prepare`
2. Run linting manually: `yarn lint:fix`
3. Run type checking: `yarn typecheck`
4. Fix any errors before committing

## Environment Issues

### Issue: Wrong Node.js or Yarn version

**Solution:**

1. Check required versions in `package.json`:
   - Node.js: >=22
   - Yarn: ^4.9.1
2. Use a version manager:
   - [nvm](https://github.com/nvm-sh/nvm) for Node.js
   - Yarn version is managed by the `packageManager` field
3. Update your environment to match requirements

## Getting Help

If you're still experiencing issues:

1. Check the [Development Setup Guide](./development-setup.md) for setup instructions
2. Review the [Testing Guide](./testing.md) for test-related issues
3. Check the [Code Style Guide](./code-style.md) for code-related issues
4. Ask for help in the [Discord community](https://discord.gg/pRYNYr4W5A)
5. Search or create an issue on [GitHub](https://github.com/actualbudget/actual/issues)
