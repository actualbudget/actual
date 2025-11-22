---
title: Development Setup
---

This guide will help you set up your development environment for contributing to Actual.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 22 or greater. You can download it from the [Node.js website](https://nodejs.org/en/download) (we recommend the LTS version).
  - Consider using a version manager like [nvm](https://github.com/nvm-sh/nvm) or [asdf](https://asdf-vm.com) to manage multiple Node.js versions.
  - On Windows, during Node.js installation, be sure to select _Automatically install the necessary tools_ from the _Tools for Native Modules_ page. This is required to build better-sqlite3.

- **Yarn**: Version 4.9.1 or greater. Yarn is the package manager used by Actual.
  - The project uses Yarn 4 workspaces (monorepo structure).

- **Git**: Required for cloning the repository and version control.

## Initial Setup

1. Clone the Actual repository:

   ```bash
   git clone https://github.com/actualbudget/actual.git
   cd actual
   ```

2. Install all dependencies:

   ```bash
   yarn install
   ```

   This will install dependencies for all packages in the monorepo.

3. Verify your setup by running type checking:
   ```bash
   yarn typecheck
   ```

## Essential Development Commands

All commands should be run from the **root directory** of the repository. Never run yarn commands from child workspace directories.

### Type Checking

```bash
# Run TypeScript type checking (ALWAYS run before committing)
yarn typecheck
```

### Linting and Formatting

```bash
# Check for linting and formatting issues
yarn lint

# Auto-fix linting and formatting issues
yarn lint:fix
```

### Testing

```bash
# Run all tests across all packages
yarn test

# Run tests without cache (for debugging)
yarn test:debug
```

For more details on testing, see the [Testing Guide](./testing.md).

### Starting Development Servers

```bash
# Start browser development server
yarn start
# or explicitly:
yarn start:browser

# Start with sync server (for testing sync functionality)
yarn start:server-dev

# Start desktop app development
yarn start:desktop
```

### Building

```bash
# Build browser version
yarn build:browser

# Build desktop app
yarn build:desktop

# Build API package
yarn build:api

# Build sync server
yarn build:server
```

## Workspace Structure

Actual uses Yarn workspaces to manage a monorepo with multiple packages. For detailed information about each package, see the [Project Structure](./project-details/index.md) documentation.

## Running Workspace-Specific Commands

To run commands for a specific workspace, use:

```bash
yarn workspace <workspace-name> run <command>
```

Examples:

```bash
# Run tests for loot-core
yarn workspace loot-core run test

# Start the docs development server
yarn workspace docs start

# Build the API package
yarn workspace @actual-app/api build
```

## Common Development Tasks

### Running Specific Tests

See [Testing Guide](./testing.md).

### Debugging

```bash
# Run tests in debug mode (without cache)
yarn test:debug

# Run E2E tests with headed browser
yarn workspace @actual-app/web run playwright test --headed --debug accounts.test.ts
```

### Type Checking

TypeScript uses project references. Always run `yarn typecheck` from the root to check all packages.

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

## Development Workflow

When making changes:

1. Read relevant files to understand the current implementation
2. Make focused, incremental changes
3. Run type checking: `yarn typecheck`
4. Run linting: `yarn lint:fix`
5. Run relevant tests
6. Fix any linter errors that are introduced

For more details, see the [Development Workflow](./index.md#development-workflow) section.

## Troubleshooting

If you encounter issues:

- **Type errors**: Run `yarn typecheck` to see all type errors
- **Linter errors**: Run `yarn lint:fix` to auto-fix many issues
- **Test failures**: See the [Testing Guide](./testing.md) for debugging tips
- **Build failures**: Clean build artifacts and reinstall dependencies:
  ```bash
  rm -rf packages/*/dist packages/*/lib-dist packages/*/build
  yarn install
  ```

For more troubleshooting help, see the [Troubleshooting Guide](./troubleshooting.md).

## Next Steps

- Read the [Contributing Guide](./index.md) for information about submitting changes
- Review the [Code Style Guide](./code-style.md) for coding conventions
- Check out the [Testing Guide](./testing.md) for testing strategies
- Explore the [Project Structure](./project-details/index.md) to understand the codebase organization
