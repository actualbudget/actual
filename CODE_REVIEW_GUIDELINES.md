# CODE_REVIEW_GUIDELINES.md - Guidelines for LLM Agents Performing Code Reviews

This document provides specific guidelines for LLM agents performing code reviews on the Actual Budget codebase. These guidelines help maintain code quality, consistency, and follow the project's design principles.

## Settings Proliferation

**Do NOT add new settings for every little UI tweak.**

Actual Budget follows a design philosophy that prioritizes simplicity and avoids settings bloat. Before introducing code that adds new settings:

- Consider if the UI tweak can be achieved through existing theme/design tokens
- Evaluate whether the setting provides meaningful value to users
- Check if the change aligns with Actual's design guidelines
- Prefer hardcoded values or theme-based solutions over adding user-facing settings

## TypeScript Strict Mode Suppressions

**Do NOT approve code that adds new `@ts-strict-ignore` comments.**

The project uses strict TypeScript checking via `typescript-strict-plugin`. Adding `@ts-strict-ignore` comments undermines type safety. Instead, review should encourage:

- Fixing the underlying type issue
- Using proper type definitions
- Refactoring code to satisfy strict type checking
- Only in exceptional cases, document why strict checking cannot be applied and seek alternative solutions

## Linter Suppressions

**Do NOT approve code that adds new `eslint-disable` or `oxlint-disable` comments.**

Linter rules are in place for good reasons. Instead of suppressing them:

- Fix the underlying issue
- If the rule is incorrectly flagging valid code, consider if the code can be refactored
- Only approve suppressions if there's a documented, exceptional reason

## Type Assertions

**Prefer `x satisfies SomeType` over `x as SomeType` for type coercions.**

The `satisfies` operator provides better type safety by:

- Ensuring the value actually satisfies the type (narrowing)
- Preserving the actual type information for better inference
- Catching type mismatches at compile time

**Exception:** If you truly need to assert a type that TypeScript cannot verify (e.g., runtime type guards), use `as` but require a comment explaining why it's safe.

## Avoiding `any` and `unknown`

**Flag code that uses `any` or `unknown` unless absolutely necessary.**

The use of `any` or `unknown` should be rare and well-justified. Before approving:

- Require explicit justification for why the type cannot be determined
- Suggest using proper type definitions or generics
- Consider if the type can be narrowed or properly inferred
- Look for existing type definitions in `packages/loot-core/src/types/`

Only approve `any` or `unknown` if there's a documented, exceptional reason (e.g., interop with untyped external libraries, gradual migration).

## Internationalization (i18n)

**All user-facing strings must be translated.**

The project has custom ESLint rules (`actual/no-untranslated-strings`) that enforce i18n usage, but reviewers should actively flag untranslated strings:

- Use `Trans` component instead of `t()` function when possible
- All text visible to users must use i18n functions
- Flag hardcoded strings that should be translated

## Test Mocking

**Minimize mocked dependencies; prefer real implementations.**

When reviewing tests, encourage the use of real implementations over mocks:

- Prefer real dependencies, utilities, and data structures
- Only mock when the real implementation is impractical (e.g., external APIs, file system in unit tests)
- Ensure mocks accurately represent real behavior

Over-mocking makes tests brittle and less reliable. Real implementations provide better confidence that code works correctly.

## Financial Number Typography

Standalone financial numbers should have tabular number styles applied.

- Standalone financial numbers should be wrapped with `FinancialText` or `styles.tnum` should be applied directly if wrapping is not possible

## Related Documentation

- See [AGENTS.md](./AGENTS.md) for general development guidelines
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
- Community documentation: [https://actualbudget.org/docs/contributing/](https://actualbudget.org/docs/contributing/)
