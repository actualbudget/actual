# Code review rubric for actualbudget/actual

A condensed checklist distilled from `CODE_REVIEW_GUIDELINES.md`, `AGENTS.md`, and `.github/agents/pr-and-commit-rules.md` so the reviewer can stay in flow without re-reading hundreds of lines mid-review. When a finding fires, cite the rule by section name (e.g., "Type assertions") so the user can trace it back.

## Hard rejections (Critical or Important)

These come from `CODE_REVIEW_GUIDELINES.md` and are non-negotiable unless the PR contains a documented justification.

- **New settings for UI tweaks.** Actual deliberately resists settings bloat. If the PR adds a user-facing toggle/preference for something a theme/design token could express, flag as Important and propose the theme-based alternative.
- **New `@ts-strict-ignore` comments.** Strict checking exists for a reason; suppressions undermine it. Suggest fixing the underlying types instead. Mark as Important (Critical if it's hiding a real type error).
- **New `eslint-disable` or `oxlint-disable` comments.** Same logic. Propose the fix that satisfies the rule.
- **Secrets / credentials in code.** Critical. Always.

## Type rules (`AGENTS.md` + `CODE_REVIEW_GUIDELINES.md`)

- Prefer `type` over `interface`.
- No `enum` — use object maps.
- No `any` / `unknown` without justification. Look in `packages/loot-core/src/types/` for an existing type before suggesting a new one.
- Prefer `satisfies SomeType` over `as SomeType`. The exception is genuine runtime type guards — those need a comment explaining why `as` is safe.
- No `React.FC`, `React.FunctionComponent`, or `React.*` general usage — use named imports and type props directly.

## React patterns

- React Compiler is on in `desktop-client`. Don't add manual `useCallback` / `useMemo` / `React.memo` unless a non-compiled dependency genuinely needs a stable identity. Flag unnecessary memoization as a Suggestion.
- Use `<Link>` from the router, not `<a>` tags.
- Hooks must come from the project's wrappers:
  - `useNavigate`, etc. from `src/hooks` (not `react-router-dom`).
  - `useDispatch`, `useSelector`, `useStore` from `src/redux` (not `react-redux`).
- Avoid nested component definitions inside other components (unstable identities).

## Imports

- `import { v4 as uuidv4 } from 'uuid';` — never the default `uuid` import.
- No direct color imports; use the theme.
- No `@actual-app/web/*` imports inside `loot-core`.
- Import order: React → built-ins → external → actual packages (`loot-core`, `@actual-app/components`) → parent → sibling → index. Keep blank lines between groups. Lint enforces this; flag violations as Suggestions.

## Internationalization

- All user-facing strings must be translated. Prefer `<Trans>` over `t()`.
- The `actual/no-untranslated-strings` ESLint rule catches most of this, but the reviewer should still spot-check obvious misses (e.g., `<Button>Save</Button>`).

## Financial typography

- Standalone financial numbers must be wrapped in `FinancialText`, or have `styles.tnum` applied directly when wrapping isn't possible. Tabular figures matter for legibility in budget UIs.

## Tests

- Minimize mocks. Real implementations > stubs for unit and component tests. Only mock genuinely impractical dependencies (external network, filesystem in unit context).
- Vitest globals (`describe`, `it`, `expect`, `beforeEach`) are fine — no need to import them.
- E2E lives in `packages/desktop-client/e2e/`. Page models in `e2e/page-models/` should be reused, not duplicated.

## Platform-specific code

- No direct `.api` or `.electron` imports from non-platform code. Use the conditional exports in `loot-core`.

## Commit / PR rules (from `.github/agents/pr-and-commit-rules.md`)

These are mandatory for AI-authored PRs. Verify and flag misses as Important.

- Commit messages prefixed with `[AI]`.
- PR title prefixed with `[AI]` (the `"AI generated"` label is auto-applied based on this prefix, so no need to verify it separately).
- PR template **not** filled in (unless a human explicitly asked for it, in which case it must be in Chinese — yes, really).
- No `--no-verify`, `--no-gpg-sign`, force-pushes to main, or destructive git ops.

## Specific files / paths to give extra scrutiny

- `packages/loot-core/src/server/migrations/` — schema migrations. Must be idempotent; flag any that aren't, and any that drop or rewrite data without a backfill story. **Critical** by default.
- `packages/loot-core/src/server/budget/` — budget math. Off-by-one or rounding errors here directly cost users money in their reports. Read carefully.
- `packages/desktop-client/src/components/budget/` — main UI surface. Re-render patterns and selector usage matter here.
- `packages/sync-server/` — server-side; review CRDT / sync changes carefully for ordering and race conditions.
- `packages/desktop-client/e2e/*-snapshots/` — VRT snapshots. If the PR updates these, the diff itself is the review: open the new PNG, confirm the visual change matches the PR's stated intent.

## What to skip

- Generated files: `packages/component-library/src/icons/` (auto-generated; don't review).
- Build artifacts: `*/dist`, `*/build`, `*/lib-dist` (shouldn't be in PRs).
- Translation source files: don't review machine-generated translations word by word.

## Output format reminder

Every finding gets: `path:line`, problem in 1–2 sentences, and a concrete suggested change (replacement code or diff snippet). No vague advice. The user wants to paste the fix.
