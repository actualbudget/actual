---
title: Code Style and Conventions
---

This guide outlines the coding conventions and style guidelines for contributing to Actual Budget. Following these guidelines helps maintain consistency and code quality across the codebase.

## TypeScript Guidelines

### Type Usage

- **Use TypeScript for all code**: All new code should be written in TypeScript
- **Prefer `type` over `interface`**: Use type aliases instead of interfaces when possible
- **Avoid `enum`**: Use objects or maps instead of enums
- **Avoid `any` or `unknown`**: Only use when absolutely necessary
- **Look for existing types**: Check `packages/loot-core/src/types/` for existing type definitions
- **Avoid type assertions**: Prefer `satisfies` over `as` or `!` for type narrowing
- **Use inline type imports**: `import { type MyType } from '...'`

### Naming Conventions

- **Descriptive variable names**: Use auxiliary verbs for boolean variables (e.g., `isLoaded`, `hasError`)
- **Named exports**: Use named exports for components and utilities (avoid default exports except in specific cases)

### Code Structure

- **Functional programming**: Prefer functional and declarative programming patterns - avoid classes
- **Pure functions**: Use the `function` keyword for pure functions
- **Modularization**: Prefer iteration and modularization over code duplication
- **File structure**: Structure files as: exported component/page, helpers, static content, types
- **Component files**: Create new components in their own files

## React Patterns

### Component Definition

- **Don't use `React.FunctionComponent` or `React.FC`**: Type props directly
- **Don't use `React.*` patterns**: Use named imports instead (e.g., `import { useState } from 'react'`)

### Component Example

```typescript
import { type ComponentType } from 'react';
// ... other imports

type MyComponentProps = {
  prop1: string;
  prop2: number;
};

export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### Custom Hooks

Use custom hooks from `src/hooks` instead of importing directly from react-router or react-redux:

- `useNavigate()` from `src/hooks` (not react-router)
- `useDispatch()`, `useSelector()`, `useStore()` from `src/redux` (not react-redux)

### Other React Guidelines

- **Avoid unstable nested components**: Don't define components inside other components
- **Use `satisfies` for type narrowing**: Prefer `satisfies` over type assertions
- **Use `<Link>` instead of `<a>` tags**: For internal navigation

### JSX Style

- **Declarative JSX**: Keep JSX minimal and readable
- **Avoid unnecessary curly braces**: In conditionals when not needed
- **Concise syntax**: Use concise syntax for simple statements
- **Explicit expressions**: Prefer explicit expressions (`condition && <Component />`)

## Platform-Specific Code

- **Don't directly reference platform-specific imports**: Avoid importing `.api`, `.web`, or `.electron` directly
- **Use conditional exports**: Use conditional exports in `loot-core` for platform-specific code
- **Build-time resolution**: Platform resolution happens at build time via package.json exports

## Restricted Patterns

### Never Use

- **`uuid` without destructuring**: Use `import { v4 as uuidv4 } from 'uuid'`
- **Direct color imports**: Use theme instead of importing colors directly
- **`@actual-app/web/*` imports in `loot-core`**: Don't import from web package in core

## File Structure Patterns

### Component File Structure

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

### Test File Structure

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

## Internationalization (i18n)

- **Use `Trans` component**: Prefer `Trans` component instead of `t()` function when possible
- **Translate all user-facing strings**: All user-facing strings must be translated
- **Generate i18n files**: Run `yarn generate:i18n` to generate translation files
- **ESLint enforcement**: Custom ESLint rules enforce translation usage

## Code Quality Checklist

Before committing changes, ensure:

- [ ] `yarn typecheck` passes
- [ ] `yarn lint:fix` has been run
- [ ] Relevant tests pass
- [ ] User-facing strings are translated
- [ ] Prefer `type` over `interface`

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [ESLint Configuration](./project-details/architecture.md) - See project structure for ESLint setup
