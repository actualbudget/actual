# Handoff: Modernize the transactions table on `@tanstack/react-table`

> Purpose: hand this to a fresh agent so it can continue the work without
> re-deriving context. Read it top to bottom before writing code.

## 1. Goal

Migrate the desktop transactions table onto `@tanstack/react-table` (a
**headless** library — no DOM of its own) incrementally, behind a feature flag,
so a single **column model** becomes the source of truth for column order, width,
visibility, sorting indicators, and the keyboard-navigation field lists —
replacing the duplicated, hand-maintained field arrays. The flag-off path must
stay byte-for-byte identical to today's table. Work targets
`packages/desktop-client` only; the existing custom row virtualizer stays.

## 2. Current state — Phases 1–2 are DONE on this branch

Branch **`claude/react-table-library-research-afx83z`**, tip commit
**`8e1c1fa25` — "[AI] Add TanStack Table column model for the transaction table"**.
Verified present on the branch:

- `@tanstack/react-table@^8.21.3` in `packages/desktop-client/package.json`.
- Feature flag **`transactionTableV2`, default ENABLED**, with an opt-out toggle:
  - type: `packages/loot-core/src/types/prefs.ts` (`FeatureFlag` union).
  - default `true`: `packages/desktop-client/src/hooks/useFeatureFlag.ts`
    (`DEFAULT_FEATURE_FLAG_STATE`).
  - opt-out UI: `packages/desktop-client/src/components/settings/Experimental.tsx`
    (`<FeatureToggle flag="transactionTableV2">`).
- Column model + tests:
  `packages/desktop-client/src/components/transactions/table/columns.ts` and
  `columns.test.ts` (parity test).
- `TransactionsTable.tsx` rewired: behind `useTableV2 = useFeatureFlag('transactionTableV2')`,
  the header and the `getFields*` lists derive from the model; the legacy
  hand-written path is retained for flag-off.
- Release note: `upcoming-release-notes/transaction-table-column-model.md`.

Per the commit message, the parity unit test locks the derived field lists to the
legacy `getFields` across every row kind, and the existing `TransactionsTable`
tests pass with the flag on. **Re-run `yarn typecheck`, `yarn lint`, and the
tests yourself before building on top — don't trust this line, verify it.**

> History note: a fresh clone may check the branch name out from a newer `master`
> than the branch's base and appear empty. Always `git fetch origin <branch>` and
> work from `origin/<branch>` — the work lives there, not necessarily in a fresh
> local checkout.

## 3. What the column model gives you (`table/columns.ts`)

Public API to reuse (do **not** re-derive field lists inline again):

- `TRANSACTION_COLUMNS: Array<ColumnDef<TransactionEntity>>` — the model; each
  column carries `meta` (`width: number | 'flex'`, alignment, `inTableRow` /
  `inNewRow` / `inChildRow` membership, visibility keys).
- `TABLE_TRANSACTION_FIELDS`, `NEW_TRANSACTION_FIELDS`, `CHILD_TRANSACTION_FIELDS`
  — derived id arrays replacing the old inline lists.
- `deriveTransactionFields(item, baseFields, visibility)` — replicates the legacy
  `getFields` exactly (child → `CHILD_TRANSACTION_FIELDS`; preview → `['select']`;
  temporary → drop leading field; visibility filtering for account/category).
- `getVisibleHeaderColumns(...)` / `TransactionHeaderColumn` — drive the header.

## 4. Remaining work — Phases 3–5 (the risky part)

These were deliberately **not** done because they can't be safely verified with
unit tests alone. Read before touching row rendering.

- **Phase 3 — Row cells via the model (higher risk).** Behind the flag, render
  normal-row cells by iterating the column model, preserving child/preview/parent
  branches. Verify with VRT + e2e.
- **Phase 4 — Expansion via TanStack (highest risk).** Only if worthwhile:
  reproduce the bespoke split expand/collapse animation on top of
  `getExpandedRowModel`. Verify the animation visually.
- **Phase 5 — Final parity + keep opt-out.** Confirm flag-off is unchanged; keep
  the flag as the escape hatch. Add/adjust the release note.

### Hard-won findings (why Phase 3–4 are risky)

All anchors in `TransactionsTable.tsx` at commit `8e1c1fa25` (lines drift as you
edit — prefer the named symbols):

1. **Split (child) rows have a genuinely different cell structure.** Child rows
   render placeholder/hidden cells in a different order than normal rows — see the
   `{isChild && …}` vs `{!isChild && …}` branches (~L1515–1623), mirrored by
   `CHILD_TRANSACTION_FIELDS` in the model. A uniform single-column iteration will
   change split-row DOM. The model already encodes per-row variants — keep using
   them; don't collapse to one static list.
2. **The split expand/collapse animation is bespoke.** `transactionsWithExpandedSplits`
   (~L2926) uses a `transitionId` mechanism (~L2929, L2946) that keeps the
   *previous* expansion state for rows before the transition point during the
   animation frame, coordinated with the custom virtualizer via
   `tableRef.current.anchor()` / `setRowAnimation(...)` (~L2948–2949, L3012).
   TanStack's `getExpandedRowModel` has **no equivalent** — moving expansion onto
   it will drop this animation unless you re-create the transition/anchor behavior.
3. **Sorting is server-driven.** Rows arrive already sorted; `onSort` re-queries
   the backend. `getSortedRowModel` adds nothing and would mis-sort if enabled.
   Let the model own the sort *indicator* only, not the sort itself.
4. **Row virtualization is custom** (`FixedSizeList`/`Table` in this package, not
   `@tanstack/react-virtual`). Keep it; feed it ordered rows/cells from TanStack's
   row model.

## 5. Branch, base, and contribution rules

- **Base divergence:** the branch is based on an older `master`
  (parent `d75261c42`). Before more work or a PR, **rebase onto the latest
  default branch** so the diff is clean — a raw `git diff master…branch` shows
  hundreds of unrelated files purely from base drift; that noise is not the change.
- Keep working on `claude/react-table-library-research-afx83z`; never force-push
  in a way that drops `8e1c1fa25`.
- Every **commit message** and **PR title** must start with `[AI]`.
- **Do not fill in the PR template** (leave it unmodified, boxes unchecked); do
  not open a PR unless the user asks. Prefix any GitHub comment/review/issue with 🤖.
- Never use `--no-verify`; let Husky/nano-staged hooks run. Run all `yarn`
  commands from the repo root. Use the `committing-actual-changes` skill for
  commits/PRs.

## 6. Verification

From repo root:

- `yarn typecheck` — new files must be type-strict (no `@ts-strict-ignore`).
- `yarn lint:fix` — oxlint + oxfmt; respect `actual/*` rules (i18n `Trans`,
  `FinancialText` for standalone money numbers).
- `yarn test` — lage across workspaces; run the `TransactionsTable` suite and the
  `columns.test.ts` parity test with the flag both on and off.
- **VRT** (any rendering/animation change): use the `running-vrts` skill —
  snapshots must be generated in the Linux docker image and scoped to the changed
  test only. Never generate snapshots on the host.
- **e2e:** `yarn workspace @actual-app/web e2e` for transaction flows (add/edit,
  split add/expand/collapse, delete, keyboard nav, drag-drop).
- **Manual:** `yarn start` → "Don't use a server" → "View demo"; exercise splits
  and keyboard nav with the flag on and off (toggle in Settings → Experimental).

## 7. Useful skills

`committing-actual-changes`, `writing-release-notes`, `running-vrts`,
`review-actual-pr`. Invoke via the Skill tool.
