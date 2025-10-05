# Pay Periods Implementation Guide

## Executive Summary

The Pay Periods feature extends Actual's month-based budgeting to support various pay frequencies (weekly, biweekly, semimonthly, monthly). Users can budget based on their actual pay schedule while leveraging all existing functionality.

**Key Design Decision**: Pay periods use the same month ID format (`YYYY-MM`) with MM ranging from 13-99, allowing the system to reuse existing infrastructure without schema changes.

**Architecture Principle**: Different runtime contexts (React frontend vs Node.js backend) require different config management patterns, but share the same utility functions.

---

## Core Concepts

### Month ID System

The system uses a dual-range month ID approach:

- **Calendar Months**: `YYYY-01` through `YYYY-12` (e.g., `2024-01`, `2024-12`)
- **Pay Periods**: `YYYY-13` through `YYYY-99` (e.g., `2024-13`, `2024-38`)

**Why this approach:**
- ✅ 87 possible pay periods per year (sufficient for weekly = 52 periods)
- ✅ Clear distinction between calendar and pay period data
- ✅ Reuse existing month utilities and database schema
- ✅ No breaking changes to calendar month functionality
- ✅ IDs are sortable and comparable

### Pay Period Numbering

**Critical Rule**: `YYYY-13` = First pay period of year YYYY, `YYYY-14` = Second pay period, etc.

The numbering is **year-based**, not relative to the start date:

```
2024-13 = 1st pay period of 2024 (regardless of when start date is)
2024-14 = 2nd pay period of 2024
2024-15 = 3rd pay period of 2024
...
2024-38 = 26th pay period of 2024 (for biweekly)
```

**How Start Date Works:**

The `startDate` config is a **reference point for the frequency pattern**, not the period that becomes "13":

1. Start date establishes the cadence (e.g., every 14 days for biweekly)
2. Pattern is projected backward to find the first period starting in January
3. That first period becomes `YYYY-13`
4. Subsequent periods are numbered sequentially

**Example: Biweekly with startDate = 2024-09-26**
- The Sept 26 date establishes "every 14 days" pattern
- Project backward: First period starting in Jan 2024 might be Jan 5-18
- That becomes `2024-13` (1st period)
- The original Sept period becomes `2024-51` or similar (later in sequence)

This ensures **consistent year-based numbering** regardless of configuration timing.

### The Presence Rule

**If a pay period ID exists in the system, that IS proof that pay periods are enabled.**

This principle:
- ✅ Eliminates race conditions
- ✅ Prevents redundant config checks
- ✅ Creates clean separation between ID generation and processing

**ID Generation Points** (check `config.enabled`):
- `currentMonth()` - Returns pay period ID only if enabled
- `monthFromDate()` - Converts dates to appropriate month type

**ID Processing Points** (trust the ID):
- All other functions - If they receive a pay period ID, it's valid
- No need to check `config?.enabled` - ID presence IS the check

---

## Architecture by Context

### Frontend Architecture (React)

**Source of Truth**: React hooks → Config object → Explicit passing

```
Database preferences
  ↓
useSyncedPref('showPayPeriods')
useSyncedPref('payPeriodFrequency')
useSyncedPref('payPeriodStartDate')
  ↓
usePayPeriodConfig() hook (builds config object)
  ↓
Pass config explicitly to month utils
  ↓
monthUtils.getMonthDateRange(month, config, locale)
```

**Why this pattern:**
- React hooks are the source of truth for UI state
- Config is reactive to preference changes
- No module-level singleton dependency
- Explicit dependencies (no hidden state)

**Implementation:**

```typescript
// In any React component:
function BudgetSummary({ month }) {
  const config = usePayPeriodConfig(); // From useSyncedPref

  const displayMonth = monthUtils.getMonthDateRange(
    month,
    config,  // Explicit!
    locale
  );

  return <div>{displayMonth}</div>;
}
```

**The Hook:**

```typescript
// packages/desktop-client/src/hooks/usePayPeriodConfig.ts
export function usePayPeriodConfig(): PayPeriodConfig {
  const [showPayPeriods] = useSyncedPref('showPayPeriods');
  const [payPeriodFrequency] = useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate] = useSyncedPref('payPeriodStartDate');

  return useMemo(() => ({
    enabled: showPayPeriods === 'true',
    payFrequency: (payPeriodFrequency as PayPeriodConfig['payFrequency']) || 'monthly',
    startDate: payPeriodStartDate || new Date().toISOString().slice(0, 10),
  }), [showPayPeriods, payPeriodFrequency, payPeriodStartDate]);
}
```

### Backend Architecture (Node.js Server)

**Source of Truth**: Database → Module singleton → Internal access

```
Database preferences table
  ↓
loadPayPeriodConfigFromPrefs() (on budget load)
  ↓
Module-level singleton (__payPeriodConfig)
  ↓
getPayPeriodConfig() accessed internally
  ↓
monthUtils internally use config
```

**Why this pattern:**
- Server has no React hooks
- Module singleton loaded once from DB at startup
- Stable config during request lifecycle
- Reloaded when preferences change

**Implementation:**

```typescript
// In server-side code:
function getBudgetRange(start: string, end: string) {
  // Config already loaded at startup via loadPayPeriodConfigFromPrefs()
  start = monthUtils.monthFromDate(start); // Uses getPayPeriodConfig() internally
  end = monthUtils.monthFromDate(end);
  // ...
}
```

**Initialization:**

```typescript
// packages/loot-core/src/server/budgetfiles/app.ts (on budget load)
const { loadPayPeriodConfigFromPrefs } = await import('../../shared/pay-periods');
const payPeriodPrefs = {
  showPayPeriods: await getPrefs('showPayPeriods'),
  payPeriodFrequency: await getPrefs('payPeriodFrequency'),
  payPeriodStartDate: await getPrefs('payPeriodStartDate'),
};
loadPayPeriodConfigFromPrefs(payPeriodPrefs);
```

### Shared Utilities Pattern

**Design**: Optional config parameter with singleton fallback

```typescript
export function getMonthStartDate(
  monthId: string,
  config?: PayPeriodConfig,  // Optional!
): Date {
  if (isPayPeriod(monthId)) {
    // Frontend passes config, backend uses singleton fallback
    const activeConfig = config || getPayPeriodConfig();

    if (!activeConfig) {
      throw new Error(
        `Pay period config required for '${monthId}'`
      );
    }

    return getPayPeriodStartDate(monthId, activeConfig);
  }

  return getCalendarMonthStartDate(monthId);
}
```

**Why this works:**
- ✅ Frontend MUST pass config (explicit dependency on React state)
- ✅ Backend can omit config (uses singleton loaded at startup)
- ✅ Same function works in both contexts
- ✅ Type-safe with optional parameter

---

## When Config Is Needed

### Config NOT Needed (ID Operations)

Functions that work with month IDs directly:

```typescript
// ✅ No config needed - just checking ID format
isPayPeriod('2024-31')  // true

// ✅ No config needed - string comparison
isBefore('2024-13', '2024-14')  // true

// ✅ No config needed - ID arithmetic
addMonths('2024-13', 1)  // '2024-14'

// ✅ No config needed - ID iteration
rangeInclusive('2024-13', '2024-15')  // ['2024-13', '2024-14', '2024-15']
```

**Why**: These operations only need to know the ID format/structure, not the actual dates or frequency.

### Config REQUIRED (Date/Label Computation)

Functions that need actual config values:

```typescript
// ❌ Needs config - computing actual dates
getMonthStartDate('2024-13', config)  // Needs startDate + frequency

// ❌ Needs config - computing actual dates
getMonthEndDate('2024-13', config)    // Needs startDate + frequency

// ❌ Needs config - formatting labels
nameForMonth('2024-13', locale, config)  // Needs frequency for display

// ❌ Needs config - generating periods
generatePayPeriods(2024, config)  // Needs startDate + frequency
```

**Why**: These operations need to know the actual `startDate` and `payFrequency` from the config.

### Rule of Thumb

**If the function needs to know `startDate` or `payFrequency` values → config required**
**If the function only checks/manipulates ID strings → no config needed**

---

## Implementation Patterns

### Pattern 1: Frontend Component

```typescript
import { usePayPeriodConfig } from '@desktop-client/hooks/usePayPeriodConfig';
import * as monthUtils from 'loot-core/shared/months';

function BudgetComponent({ month }) {
  // Get config from React hooks (source of truth)
  const config = usePayPeriodConfig();

  // Pass explicitly to utilities
  const startDate = monthUtils.getMonthStartDate(month, config);
  const displayName = monthUtils.nameForMonth(month, locale, config);

  return (
    <div>
      <h2>{displayName}</h2>
      <p>Starts: {startDate.toLocaleDateString()}</p>
    </div>
  );
}
```

### Pattern 2: Backend Function

```typescript
import * as monthUtils from '../../shared/months';

function processBudgetData(dateString: string) {
  // Config already loaded via loadPayPeriodConfigFromPrefs()
  // monthUtils will use getPayPeriodConfig() internally

  const monthId = monthUtils.monthFromDate(dateString);
  const startDate = monthUtils.getMonthStartDate(monthId);

  // Process using the dates...
}
```

### Pattern 3: Shared Utility

```typescript
export function getMonthDateRange(
  monthId: string,
  config?: PayPeriodConfig,
  locale?: Locale,
): string {
  if (isPayPeriod(monthId)) {
    // Frontend passes config, backend uses fallback
    const activeConfig = config || getPayPeriodConfig();

    if (!activeConfig) {
      throw new Error(`Config required for pay period '${monthId}'`);
    }

    const start = getPayPeriodStartDate(monthId, activeConfig);
    const end = getPayPeriodEndDate(monthId, activeConfig);
    return formatDateRange(start, end, locale);
  }

  return formatCalendarMonth(monthId, locale);
}
```

---

## Key Lessons Learned

### Lesson 1: Different Contexts Need Different Patterns

**The Problem**: Originally tried to use the same module singleton pattern in both frontend and backend.

**The Reality**:
- React components need reactive hooks
- Node.js server needs stable singletons
- Same pattern doesn't fit both contexts

**The Solution**:
- Frontend: `usePayPeriodConfig()` hook from `useSyncedPref`
- Backend: Module-level `getPayPeriodConfig()` singleton
- Shared utils: Optional parameter bridges both worlds

### Lesson 2: Don't Sync React State to Module Singletons

**The Problem**: Frontend was calling `loadPayPeriodConfigFromPrefs()` in `useEffect` to sync React state to module singleton.

**The Issues**:
- Dual state management (hooks AND singleton)
- Race conditions (config might not be synced when needed)
- Manual synchronization logic
- Not reactive to preference changes

**The Solution**:
- Use React hooks as the ONLY source of truth in frontend
- Pass config explicitly to functions
- No manual synchronization needed

**Before (❌ Bad)**:
```typescript
function BudgetPage() {
  const [showPayPeriods] = useSyncedPref('showPayPeriods');
  const [frequency] = useSyncedPref('payPeriodFrequency');
  const [startDate] = useSyncedPref('payPeriodStartDate');

  useEffect(() => {
    // ❌ Manually sync React state to module singleton
    loadPayPeriodConfigFromPrefs({
      showPayPeriods,
      payPeriodFrequency: frequency,
      payPeriodStartDate: startDate,
    });
  }, [showPayPeriods, frequency, startDate]);

  // ❌ Uses module singleton, not React state
  const displayMonth = monthUtils.getMonthDateRange(month);
}
```

**After (✅ Good)**:
```typescript
function BudgetPage() {
  // ✅ Single source of truth from hooks
  const config = usePayPeriodConfig();

  // ✅ Explicit dependency on React state
  const displayMonth = monthUtils.getMonthDateRange(month, config, locale);
}
```

### Lesson 3: Config Only When You Need Config Values

**Don't need config for**:
- ✅ ID validation: `isPayPeriod('2024-31')`
- ✅ ID arithmetic: `addMonths('2024-13', 5)`
- ✅ ID comparison: `isBefore('2024-13', '2024-14')`
- ✅ Range generation: `rangeInclusive('2024-13', '2024-15')`

**Do need config for**:
- ❌ Date calculation: `getMonthStartDate('2024-13', config)`
- ❌ Label formatting: `nameForMonth('2024-13', locale, config)`
- ❌ Period generation: `generatePayPeriods(2024, config)`

**Rule of thumb**: If you need to know `startDate` or `payFrequency` actual values, you need config.

### Lesson 4: The Presence Rule Prevents Redundant Checks

**The Principle**: If a pay period ID exists in the system, pay periods are enabled.

**Why**: ID generation functions (`currentMonth`, `monthFromDate`) only return pay period IDs when `config.enabled === true`.

**What this means**:
- ✅ Processing functions can trust the ID type
- ✅ No need to check `config?.enabled` in processing code
- ✅ Fail fast with clear errors if config missing

**Anti-Pattern (❌ Redundant)**:
```typescript
if (isPayPeriod(monthId)) {
  const config = getPayPeriodConfig();
  if (config?.enabled) {  // ❌ Redundant! ID presence is proof
    return computePayPeriod(monthId, config);
  }
}
```

**Correct Pattern (✅)**:
```typescript
if (isPayPeriod(monthId)) {
  const config = getPayPeriodConfig();
  if (!config) {
    // ✅ Fail fast with clear error
    throw new Error(`Config required for pay period '${monthId}'`);
  }
  return computePayPeriod(monthId, config);
}
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Frontend Using Module Singleton

```typescript
// ❌ BAD: Race condition! Config might not be loaded
function BudgetSummary({ month }) {
  const config = monthUtils.getPayPeriodConfig();  // From module singleton
  const displayMonth = monthUtils.getMonthDateRange(month, config, locale);
}
```

**Why it's bad**: Module singleton isn't synced with React state, race conditions possible.

**Fix**: Use `usePayPeriodConfig()` hook.

### ❌ Anti-Pattern 2: Redundant Config Checks

```typescript
// ❌ BAD: Checking config.enabled when ID presence already proves it
if (isPayPeriod(monthId)) {
  const config = getPayPeriodConfig();
  if (config?.enabled) {  // ❌ Redundant!
    return processPayPeriod(monthId, config);
  }
  return processCalendarMonth(monthId);  // ❌ Wrong! We have pay period ID!
}
```

**Why it's bad**: The Presence Rule means if we have a pay period ID, it's enabled.

**Fix**: Trust the ID, only check if config exists (not enabled flag).

### ❌ Anti-Pattern 3: Config Checks Where Not Needed

```typescript
// ❌ BAD: isPayPeriod doesn't need config
const config = getPayPeriodConfig();
if (config?.enabled && isPayPeriod(monthId)) {
  // ...
}
```

**Why it's bad**: `isPayPeriod` only checks ID format, doesn't need config.

**Fix**: Check ID first, get config only if needed for dates/labels.

### ❌ Anti-Pattern 4: Manual React State Sync

```typescript
// ❌ BAD: Syncing React hooks to module singleton
useEffect(() => {
  loadPayPeriodConfigFromPrefs({
    showPayPeriods: payPeriodEnabled,
    payPeriodFrequency: frequency,
    payPeriodStartDate: startDate,
  });
}, [payPeriodEnabled, frequency, startDate]);
```

**Why it's bad**: Dual state management, race conditions, unnecessary complexity.

**Fix**: Use `usePayPeriodConfig()` hook directly, pass config explicitly.

---

## File Organization

### Core Implementation Files

**`loot-core/src/shared/pay-periods.ts`**
- Core pay period logic and algorithms
- Module singleton `__payPeriodConfig` for backend
- `getPayPeriodConfig()`, `setPayPeriodConfig()` functions
- `loadPayPeriodConfigFromPrefs()` for backend initialization
- Period generation, navigation, and calculation functions

**`loot-core/src/shared/months.ts`**
- Unified month utilities (calendar + pay period)
- Functions with optional `config` parameter
- Falls back to `getPayPeriodConfig()` for backend compat
- Frontend should always pass config explicitly

**`desktop-client/src/hooks/usePayPeriodConfig.ts`**
- Frontend React hook for config management
- Builds config from `useSyncedPref` hooks
- Single source of truth for React components
- Returns memoized `PayPeriodConfig` object

### Backend Integration

**`loot-core/src/server/budgetfiles/app.ts`**
- Loads pay period config from DB on budget load
- Calls `loadPayPeriodConfigFromPrefs()` during initialization
- Config available via singleton for entire request lifecycle

**`loot-core/src/server/preferences/app.ts`**
- Reloads config when pay period preferences change
- Ensures singleton stays in sync with database
- Calls `loadPayPeriodConfigFromPrefs()` on pref updates

### Frontend Components Using Config

**Budget Components**:
- `desktop-client/src/components/budget/index.tsx` - Main budget component
- `desktop-client/src/components/budget/MonthPicker.tsx` - Month navigation
- `desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx`
- `desktop-client/src/components/budget/tracking/budgetsummary/BudgetSummary.tsx`

**Mobile Components**:
- `desktop-client/src/components/mobile/budget/BudgetPage.tsx`

All use `usePayPeriodConfig()` and pass config to month utils explicitly.

---

## Testing Strategy

### Frontend Component Tests

**Pattern**: Use `usePayPeriodConfig()` in test components or mock the hook.

```typescript
import { usePayPeriodConfig } from '@desktop-client/hooks/usePayPeriodConfig';

test('displays pay period correctly', () => {
  // Mock the hook or provide test preferences
  render(<BudgetSummary month="2024-13" />);
  expect(screen.getByText(/Pay Period 1/)).toBeInTheDocument();
});
```

**Benefits**:
- No need to mock module singletons
- Tests are explicit about config dependencies
- Can test preference reactivity

### Backend Function Tests

**Pattern**: Call `loadPayPeriodConfigFromPrefs()` in test setup.

```typescript
import { loadPayPeriodConfigFromPrefs } from 'loot-core/src/shared/pay-periods';

beforeEach(() => {
  loadPayPeriodConfigFromPrefs({
    showPayPeriods: 'true',
    payPeriodFrequency: 'biweekly',
    payPeriodStartDate: '2024-01-05',
  });
});

test('processes pay period data', () => {
  const result = processBudgetData('2024-01-10');
  expect(result.monthId).toBe('2024-13');
});
```

**Benefits**:
- Module singleton pattern works fine in tests
- Mirrors actual backend behavior
- Can test different config states easily

### Shared Utility Tests

**Pattern**: Pass config explicitly (frontend style) for clarity.

```typescript
test('getMonthStartDate with pay period', () => {
  const config: PayPeriodConfig = {
    enabled: true,
    payFrequency: 'biweekly',
    startDate: '2024-01-05',
  };

  const startDate = monthUtils.getMonthStartDate('2024-13', config);
  expect(startDate).toEqual(new Date('2024-01-05'));
});
```

**Benefits**:
- Explicit dependencies
- No hidden module state
- Easy to test edge cases

---

## Migration Guide

### Migrating from Old Pattern

**Old Pattern (Manual Sync)**:
```typescript
const [showPayPeriods] = useSyncedPref('showPayPeriods');
const [frequency] = useSyncedPref('payPeriodFrequency');
const [startDate] = useSyncedPref('payPeriodStartDate');

useEffect(() => {
  loadPayPeriodConfigFromPrefs({
    showPayPeriods,
    payPeriodFrequency: frequency,
    payPeriodStartDate: startDate,
  });
}, [showPayPeriods, frequency, startDate]);

const displayMonth = monthUtils.getMonthDateRange(month);
```

**New Pattern (Hook)**:
```typescript
const config = usePayPeriodConfig();

const displayMonth = monthUtils.getMonthDateRange(month, config, locale);
```

### Migration Checklist

For each component:

1. ✅ **Remove** individual `useSyncedPref` calls for pay period prefs
2. ✅ **Remove** `useEffect` with `loadPayPeriodConfigFromPrefs()`
3. ✅ **Add** `const config = usePayPeriodConfig()` at component level
4. ✅ **Update** all month utils calls to pass `config` parameter
5. ✅ **Remove** any `monthUtils.getPayPeriodConfig()` calls
6. ✅ **Test** that preferences changes update the UI correctly

### Files Changed in Migration

**New Files Created**:
- `packages/desktop-client/src/hooks/usePayPeriodConfig.ts`

**Files Modified**:
- `packages/desktop-client/src/components/budget/index.tsx`
- `packages/desktop-client/src/components/budget/MonthPicker.tsx`
- `packages/desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx`
- `packages/desktop-client/src/components/budget/tracking/budgetsummary/BudgetSummary.tsx`
- `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx`

**Files Unchanged**:
- All backend files (still use singleton pattern)
- All shared utility files (optional config parameter preserved)

---

## Future Considerations

### Potential Enhancements

**TypeScript Branded Types**:
```typescript
type CalendarMonth = string & { __brand: 'CalendarMonth' };
type PayPeriodMonth = string & { __brand: 'PayPeriodMonth' };
```
Could provide compile-time safety against mixing month types.

**Performance Optimizations**:
- Lazy loading of pay period generation
- Caching strategies for frequently accessed periods
- Memoization of expensive date calculations

**Additional Pay Frequencies**:
- Daily (for contractors)
- Quarterly (for some businesses)
- Custom intervals

**Better Error Messages**:
- More context in errors
- Suggestions for fixes
- Debug helpers

### Architectural Considerations

**Maintain Separation**:
- Keep frontend using React hooks pattern
- Keep backend using singleton pattern
- Don't try to unify them

**Preserve Optional Config**:
- Shared utilities should keep optional config parameter
- Allows both contexts to work naturally
- Don't force one pattern over the other

---

## Summary

The Pay Periods system successfully extends Actual's month-based budgeting to support various pay frequencies while maintaining:

### Core Achievements

✅ **Backward Compatibility**: Calendar months (01-12) work unchanged
✅ **Clear Separation**: Pay periods (13-99) are distinct and identifiable
✅ **Robust Architecture**: Different patterns for different contexts
✅ **Explicit Dependencies**: Frontend passes config, no hidden state
✅ **Performance**: Cached config and efficient period generation
✅ **Flexibility**: Support for weekly, biweekly, semimonthly, and monthly
✅ **Type Safety**: Prevention of mixed month type operations

### Key Principles

1. **The Presence Rule**: Pay period ID existence = proof of enablement
2. **Context-Appropriate Patterns**: React hooks for frontend, singletons for backend
3. **Config Only When Needed**: ID operations don't need config, date/label operations do
4. **Explicit Over Implicit**: Pass config explicitly in frontend, trust singleton in backend
5. **Fail Fast**: Clear errors better than silent failures or unsafe fallbacks

This architecture allows users to budget based on their actual pay schedule while maintaining clean separation of concerns and leveraging the strengths of each runtime environment.

---

## Development Commands

### Building the Project

**Build the browser/web version**:
```bash
yarn workspace loot-core build:browser
```

**Build the entire project for browser**:
```bash
./bin/package-browser
```

**Build the desktop version**:
```bash
./bin/package-electron
```

**Build the API package**:
```bash
yarn workspace @actual-app/api build
```

### Running Tests

**Run all tests across all workspaces**:
```bash
yarn test
```

**Run tests for a specific workspace**:
```bash
yarn workspace loot-core test
```

**Run specific test file(s) with vitest**:
```bash
yarn workspace loot-core vitest run src/shared/pay-periods.test.ts
yarn workspace loot-core vitest run src/shared/months.test.ts
```

**Run tests in watch mode**:
```bash
yarn workspace loot-core vitest watch src/shared/pay-periods.test.ts
```

**Run tests matching a pattern**:
```bash
yarn workspace loot-core vitest run --grep "pay period"
```

### Development Workflow

**Start the browser development server**:
```bash
yarn start:browser
# This runs both:
# - loot-core watch:browser (backend)
# - @actual-app/web start:browser (frontend)
```

**Start the desktop development environment**:
```bash
yarn start:desktop
# This runs:
# - loot-core watch:node (backend)
# - @actual-app/web watch (web UI)
# - desktop-electron watch (Electron wrapper)
```

**Start the sync server**:
```bash
yarn start:server
```

### Quick Testing Workflow for Pay Periods

When making changes to pay period code:

1. **Run unit tests** (fastest):
```bash
yarn workspace loot-core vitest run src/shared/pay-periods.test.ts
```

2. **Run integration tests**:
```bash
yarn workspace loot-core vitest run src/shared/months.test.ts
```

3. **Build to verify no compile errors**:
```bash
yarn workspace loot-core build:browser
```

4. **Test in the browser** (if UI changes):
```bash
yarn start:browser
# Navigate to http://localhost:3001
```

### Troubleshooting Build/Test Issues

**Clear build cache**:
```bash
rm -rf packages/loot-core/lib-dist/
yarn workspace loot-core build:browser
```

**Reset test database** (if tests fail inconsistently):
```bash
# Tests use global.emptyDatabase() automatically
# But if issues persist, check beforeEach hooks
```

**Check TypeScript errors**:
```bash
yarn workspace loot-core tsc --noEmit
```

### Pre-Commit Checklist

Before committing changes to pay period code:

```bash
# 1. Run all pay period tests
yarn workspace loot-core vitest run src/shared/pay-periods.test.ts
yarn workspace loot-core vitest run src/shared/months.test.ts

# 2. Build successfully
yarn workspace loot-core build:browser

# 3. Optional: Run full test suite if changing core logic
yarn workspace loot-core test

# 4. Format code (if project has formatter)
yarn format  # or yarn lint
```

---
