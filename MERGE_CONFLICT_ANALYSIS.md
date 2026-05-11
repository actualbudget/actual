# Merge Conflict Analysis

## Summary

Merge conflicts detected between `cursor/transaction-table-rewrite-f077` branch and `origin/master` in:

- `packages/desktop-client/src/components/transactions/TransactionList.tsx`

## Conflict Classification

### ✅ SIMPLE CONFLICT #1: Missing Core Imports (lines 9-25)

**Location:** Import section after theme import

**Master branch has:**

```typescript
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { getUpcomingDays } from '@actual-app/core/shared/schedules';
import {
  addSplitTransaction,
  applyTransactionDiff,
  isPreviewId,
  realizeTempTransactions,
  splitTransaction,
  updateTransaction,
} from '@actual-app/core/shared/transactions';
import { applyChanges, getChangedValues } from '@actual-app/core/shared/util';
```

**Our branch has:**

```typescript
(empty lines)
```

**Resolution:** ✅ **KEEP MASTER'S IMPORTS**

- These imports are NOT needed in our refactored version since we moved all mutation logic to `useTransactionListHandlers` hook
- However, other parts of the codebase may have been updated on master to use these with the new `@actual-app/core` paths (subpath imports migration)
- Since `useTransactionListHandlers` already imports these utilities from their original locations, we don't need them here
- **Action: Remove these imports (keep our version)**

---

### ⚠️ COMPLICATED CONFLICT #2: Component Import & Architecture (lines 44-58)

**Location:** TransactionTable component import and related imports

**Master branch has:**

```typescript
import { TransactionTable } from './TransactionsTable';
import type { TransactionTableProps } from './TransactionsTable';
```

**Our branch has:**

```typescript
import { TransactionTable } from './TransactionTable';
import type { TransactionTableProps } from './TransactionTable';
import { useTransactionListHandlers } from './transaction-list/useTransactionListHandlers';

import type { TableHandleRef } from '@desktop-client/components/table';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useDispatch } from '@desktop-client/redux';

export { createSingleTimeScheduleFromTransaction } from './transaction-list/schedule';
```

**Analysis:**

1. **Component name change:** `TransactionsTable` (old) → `TransactionTable` (new)
   - This is the CORE of the rewrite - we're replacing the entire component
2. **New custom hook:** `useTransactionListHandlers`
   - Our branch refactored all inline handler logic into this reusable hook
   - This is a significant architectural improvement
3. **Duplicate imports with wrong alias:**
   - Our branch has imports using `@desktop-client/*` alias
   - These are already imported above using the `#` alias (correct per codebase standards)
   - These are DUPLICATES and should be removed
4. **Export statement:**
   - Our branch exports `createSingleTimeScheduleFromTransaction` from separate module
   - Master has this function inline in the file
   - Our refactor separated this into `transaction-list/schedule.ts`

5. **ErrorBoundary:**
   - Master added `ErrorBoundary` import (line 5)
   - This is a new addition from commit 13abe0cb0 "Addition of scoped ErrorBoundarys"
   - We NEED to keep this import

**Resolution:** ⚠️ **MANUAL MERGE REQUIRED**

- Keep our new component import: `./TransactionTable`
- Keep our custom hook import: `useTransactionListHandlers`
- **Add ErrorBoundary import from master:** `import { ErrorBoundary } from 'react-error-boundary';`
- **Add FeatureErrorFallback import from master:** `import { FeatureErrorFallback } from '#components/FeatureErrorFallback';`
- Remove duplicate imports (the ones with `@desktop-client/*` - already imported with `#` alias)
- Keep our export statement for `createSingleTimeScheduleFromTransaction`

---

### ✅ SIMPLE CONFLICT #3: Additional Type Imports

**Master branch has additional types:**

```typescript
import type {
  AccountEntity,
  CategoryEntity,
  PayeeEntity,
  RuleActionEntity,
  RuleConditionEntity,
  ScheduleEntity,
  TransactionEntity,
  TransactionFilterEntity,
} from '@actual-app/core/types/models';
```

**Our branch has:**

```typescript
import type {
  AccountEntity,
  CategoryEntity,
  RuleConditionEntity,
  TransactionEntity,
  TransactionFilterEntity,
} from 'loot-core/types/models';
```

**Resolution:** ✅ **USE MASTER'S VERSION**

- Master updated import path: `loot-core` → `@actual-app/core` (subpath imports migration)
- Master has more types (PayeeEntity, RuleActionEntity, ScheduleEntity) - these may be needed
- **Action: Use master's import with all types**

---

## Additional Considerations

### JSX Changes in Component Body

Need to verify if master's ErrorBoundary wrapper was added to the component's return statement:

**Expected master pattern:**

```typescript
return (
  <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
    <TransactionTable {...props} />
  </ErrorBoundary>
);
```

**Our branch pattern:**

```typescript
return (
  <TransactionTable {...props} />
);
```

**Resolution:** Keep ErrorBoundary wrapper from master, but with our TransactionTable component.

---

## Recommended Merge Strategy

1. **Accept our branch as base** (we're introducing the new component)
2. **Add ErrorBoundary improvements from master:**
   - Import `ErrorBoundary` from 'react-error-boundary'
   - Import `FeatureErrorFallback` from '#components/FeatureErrorFallback'
   - Wrap JSX in ErrorBoundary component
3. **Fix import paths:**
   - Update `loot-core` → `@actual-app/core` for consistency with master
   - Remove duplicate `@desktop-client/*` imports (use `#` alias versions only)
4. **Keep our architectural changes:**
   - New `TransactionTable` component (not `TransactionsTable`)
   - `useTransactionListHandlers` hook
   - Refactored utilities in `transaction-list/` directory

---

## Files to Review After Merge

- [ ] Verify `useTransactionListHandlers` uses correct import paths
- [ ] Verify `transaction-list/mutations.ts` imports are compatible
- [ ] Verify `transaction-list/schedule.ts` imports are compatible
- [ ] Run `yarn typecheck` to catch any type errors
- [ ] Run `yarn lint:fix` to fix import ordering
- [ ] Test that ErrorBoundary properly catches errors in new TransactionTable

---

## Complexity Rating

- **Conflict #1:** ⭐ Simple (remove imports)
- **Conflict #2:** ⭐⭐⭐ Moderate-Complex (architectural merge)
- **Overall:** ⭐⭐ Moderate (mostly additive changes, clear resolution path)

The conflicts are primarily due to:

1. Subpath imports migration on master (`loot-core` → `@actual-app/core`)
2. ErrorBoundary addition on master
3. Our significant architectural refactor (new component + custom hooks)

These can be resolved systematically by keeping our architecture and adopting master's improvements.
