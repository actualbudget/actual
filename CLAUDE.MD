# Pay Periods Implementation Guide

## Executive Summary

The Pay Periods feature extends Actual's month-based budgeting to support various pay frequencies (weekly, biweekly, semimonthly, monthly). Users can budget based on their actual pay schedule while leveraging all existing functionality.

**Key Design Decision**: Pay periods use the same month ID format (`YYYY-MM`) with MM ranging from 13-99, allowing the system to reuse existing infrastructure without schema changes.

**Architecture Principle**: Single source of truth via module singleton, synchronized from database preferences on both frontend and backend.

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

## Architecture: Module Singleton Pattern

### Source of Truth

**Module singleton (`__payPeriodConfig`)** is the single source of truth for the entire application (both frontend and backend).

```
Database preferences
  ↓
loadPayPeriodConfigFromPrefs()
  ↓
setPayPeriodConfig() → __payPeriodConfig (module singleton)
  ↓
getPayPeriodConfig() → Used by all month utilities
```

### Frontend Architecture

**Pattern**: React hooks read preferences → Sync to singleton → Month utils use singleton

```typescript
// In React components:
function BudgetPage() {
  const [payPeriodFrequency] = useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate] = useSyncedPref('payPeriodStartDate');
  const [payPeriodViewEnabled] = useSyncedPref('showPayPeriods');

  // Sync React state to module singleton
  useEffect(() => {
    if (!payPeriodFeatureFlagEnabled) return;

    loadPayPeriodConfigFromPrefs({
      showPayPeriods: payPeriodViewEnabled,
      payPeriodFrequency,
      payPeriodStartDate,
    });
  }, [payPeriodFeatureFlagEnabled, payPeriodViewEnabled, payPeriodFrequency, payPeriodStartDate]);

  // Month utils use singleton internally - no config passing needed
  const currentPayPeriod = monthUtils.currentMonth();
  const displayName = monthUtils.getMonthDisplayName(month, locale);

  return <div>{displayName}</div>;
}
```

**Why this pattern:**
- ✅ Single source of truth (module singleton)
- ✅ Simple function calls (no config passing)
- ✅ Clear sync point (one useEffect in main budget component)
- ✅ Consistent between frontend and backend

### Backend Architecture

**Pattern**: Database → loadPayPeriodConfig() → Singleton → Month utils

```typescript
// Server initialization (budgetfiles/app.ts)
import { loadPayPeriodConfig } from '../preferences/app';

await loadPayPeriodConfig(); // Loads from DB into singleton

// Server handlers (budget/app.ts)
export async function getBudgetBounds() {
  return await budget.createAllBudgets(); // Uses singleton internally
}

// Budget operations (budget/base.ts)
export async function createBudget(months) {
  months.forEach(month => {
    const { start, end } = monthUtils.bounds(month); // Uses singleton
    const sheetName = monthUtils.sheetForMonth(month);
    // ... create category sheets with start/end dates
  });
}
```

**Automatic Reload**: When preferences are saved, the server automatically reloads the config:

```typescript
// packages/loot-core/src/server/preferences/app.ts
async function saveSyncedPrefs({ id, value }) {
  await db.update('preferences', { id, value });

  // Reload pay period config when pay period preferences change
  if (
    id === 'showPayPeriods' ||
    id === 'payPeriodFrequency' ||
    id === 'payPeriodStartDate'
  ) {
    await loadPayPeriodConfig(); // Updates singleton from DB
  }
}
```

---

## Config Functions

### Module Singleton Functions

**`getPayPeriodConfig()`**: Returns the current config from the module singleton
```typescript
const config = getPayPeriodConfig();
// Returns: PayPeriodConfig | null
```

**`setPayPeriodConfig(config)`**: Updates the module singleton (internal use)
```typescript
setPayPeriodConfig({
  enabled: true,
  payFrequency: 'biweekly',
  startDate: '2024-01-05',
});
```

**`loadPayPeriodConfigFromPrefs(prefs)`**: Parses preferences and updates singleton
```typescript
// Frontend sync point
loadPayPeriodConfigFromPrefs({
  showPayPeriods: 'true',
  payPeriodFrequency: 'biweekly',
  payPeriodStartDate: '2024-01-05',
});

// Backend initialization
export async function loadPayPeriodConfig() {
  const prefs = await getSyncedPrefs();
  const config = {
    enabled: prefs.showPayPeriods === 'true',
    payFrequency: prefs.payPeriodFrequency || 'monthly',
    startDate: prefs.payPeriodStartDate || new Date().toISOString().slice(0, 10),
  };
  setPayPeriodConfig(config);
}
```

### Month Utility Functions

All month utilities use `getPayPeriodConfig()` internally - **no config parameter needed**:

```typescript
// ID Generation (checks config.enabled)
monthUtils.currentMonth()        // → '2024-13' or '2024-10'
monthUtils.monthFromDate(date)   // → '2024-13' or '2024-10'

// Date Operations (uses config for pay periods)
monthUtils.bounds(month)                    // → { start: 20240105, end: 20240118 }
monthUtils.getMonthStartDate(month)         // → Date
monthUtils.getMonthEndDate(month)           // → Date

// Display/Formatting (uses config for pay periods)
monthUtils.getMonthDisplayName(month, locale)     // → 'PP 1' or 'Jan'
monthUtils.nameForMonth(month, locale)            // → 'Pay Period 1' or 'January'
monthUtils.getMonthDateRange(month, locale)       // → 'Jan 5 - Jan 18' or 'January'

// ID Operations (no config needed - just string manipulation)
monthUtils.isPayPeriod(month)      // → true/false
monthUtils.addMonths(month, n)     // → '2024-14'
monthUtils.prevMonth(month)        // → '2024-12'
monthUtils.nextMonth(month)        // → '2024-14'
monthUtils.isBefore(m1, m2)        // → true/false
```

---

## The Presence Rule in Practice

### ID Generation (Check config.enabled)

Only two functions generate month IDs - they check if pay periods are enabled:

```typescript
export function currentMonth(): string {
  if (global.IS_TESTING || Platform.isPlaywright) {
    return global.currentMonth || '2017-01';
  }

  const config = getPayPeriodConfig();
  if (config?.enabled) {
    return getCurrentPayPeriod(new Date(), config); // → '2024-13'
  }

  return d.format(new Date(), 'yyyy-MM'); // → '2024-10'
}

export function monthFromDate(date: DateLike): string {
  const config = getPayPeriodConfig();
  if (config?.enabled) {
    return getPayPeriodFromDate(_parse(date), config); // → '2024-13'
  }

  return d.format(_parse(date), 'yyyy-MM'); // → '2024-10'
}
```

### ID Processing (Trust the ID)

All other functions trust that if they receive a pay period ID, config exists:

```typescript
export function bounds(month: DateLike): { start: number; end: number } {
  const monthStr = typeof month === 'string' ? month : d.format(_parse(month), 'yyyy-MM');

  if (isPayPeriod(monthStr)) {
    // Presence Rule: If ID is pay period, config must exist
    const config = getPayPeriodConfig();
    if (!config) {
      // Fail fast - this should never happen
      throw new Error(`Pay period config not available for '${monthStr}'`);
    }

    const periods = generatePayPeriods(year, config);
    const period = periods.find(p => p.monthId === monthStr);
    // ... return period bounds
  }

  // Calendar month logic
  return {
    start: parseInt(d.format(d.startOfMonth(_parse(month)), 'yyyyMMdd')),
    end: parseInt(d.format(d.endOfMonth(_parse(month)), 'yyyyMMdd')),
  };
}
```

**Anti-Pattern (Redundant Check)**:
```typescript
// ❌ BAD: Checking config.enabled when ID presence already proves it
if (isPayPeriod(monthId)) {
  const config = getPayPeriodConfig();
  if (config?.enabled) {  // ❌ Unnecessary!
    return processPayPeriod(monthId, config);
  }
}
```

**Correct Pattern**:
```typescript
// ✅ GOOD: Trust the ID, only verify config exists
if (isPayPeriod(monthId)) {
  const config = getPayPeriodConfig();
  if (!config) {
    throw new Error(`Config required for '${monthId}'`);
  }
  return processPayPeriod(monthId, config);
}
```

---

## Implementation Patterns

### Pattern 1: Frontend Component (Main Budget)

```typescript
import { loadPayPeriodConfigFromPrefs } from 'loot-core/shared/pay-periods';
import * as monthUtils from 'loot-core/shared/months';

function BudgetPage() {
  const [payPeriodFrequency] = useSyncedPref('payPeriodFrequency');
  const [payPeriodStartDate] = useSyncedPref('payPeriodStartDate');
  const [payPeriodViewEnabled] = useSyncedPref('showPayPeriods');
  const payPeriodFeatureFlagEnabled = useFeatureFlag('payPeriodsEnabled');

  // Sync React preferences to module singleton
  useEffect(() => {
    if (!payPeriodFeatureFlagEnabled) return;

    loadPayPeriodConfigFromPrefs({
      showPayPeriods: payPeriodViewEnabled,
      payPeriodFrequency,
      payPeriodStartDate,
    });
  }, [payPeriodFeatureFlagEnabled, payPeriodViewEnabled, payPeriodFrequency, payPeriodStartDate]);

  // Month utils use singleton - no config passing!
  const currentPayPeriod = monthUtils.currentMonth();
  const displayName = monthUtils.getMonthDisplayName(month, locale);

  return <div>{displayName}</div>;
}
```

### Pattern 2: Frontend Component (Other Components)

```typescript
import * as monthUtils from 'loot-core/shared/months';

function MonthPicker({ month }) {
  // No config management needed - singleton is already synced from main budget component
  const currentMonth = monthUtils.currentMonth();
  const displayName = monthUtils.getMonthDisplayName(month, locale);

  return <div>{displayName}</div>;
}
```

### Pattern 3: Backend Function

```typescript
import * as monthUtils from '../../shared/months';

async function createBudget(months: string[]) {
  // Config already loaded via loadPayPeriodConfig() at server startup
  // Month utils use singleton internally

  months.forEach(month => {
    const { start, end } = monthUtils.bounds(month);
    const sheetName = monthUtils.sheetForMonth(month);
    // ... create spreadsheet cells
  });
}
```

### Pattern 4: Tests

```typescript
import { loadPayPeriodConfigFromPrefs } from 'loot-core/src/shared/pay-periods';

beforeEach(() => {
  // Set up singleton for tests
  loadPayPeriodConfigFromPrefs({
    showPayPeriods: 'true',
    payPeriodFrequency: 'biweekly',
    payPeriodStartDate: '2024-01-05',
  });
});

test('processes pay period data', () => {
  const monthId = monthUtils.monthFromDate('2024-01-10');
  expect(monthId).toBe('2024-13');
});
```

---

## Key Principles

### 1. Single Source of Truth

**Module singleton (`__payPeriodConfig`)** is the ONLY source of truth.

- ✅ Frontend syncs from React hooks → singleton
- ✅ Backend loads from database → singleton
- ✅ All month utilities use singleton
- ❌ Never have dual state management

### 2. The Presence Rule

**If a pay period ID exists, pay periods are enabled.**

- ✅ Only `currentMonth()` and `monthFromDate()` check `config.enabled`
- ✅ All other functions trust the ID type
- ✅ Fail fast with clear errors if config missing
- ❌ Never check `config.enabled` in processing code

### 3. Clear Sync Points

**Exactly one sync point per context:**

- Frontend: `loadPayPeriodConfigFromPrefs()` in budget/index.tsx useEffect
- Backend: `loadPayPeriodConfig()` on budget load and preference changes

### 4. Simple Function Calls

**Month utilities never require config parameters:**

```typescript
// ✅ Simple - uses singleton
const month = monthUtils.currentMonth();
const display = monthUtils.getMonthDisplayName(month, locale);

// ❌ Complex - would require passing config everywhere
const month = monthUtils.currentMonth(config);
const display = monthUtils.getMonthDisplayName(month, config, locale);
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Passing Config Parameters

```typescript
// ❌ BAD: Don't pass config to month utils
const config = getPayPeriodConfig();
const month = monthUtils.currentMonth(config);
```

**Why it's bad**: Creates unnecessary complexity. Singleton already has config.

**Fix**: Let month utils use singleton internally.

### ❌ Anti-Pattern 2: Checking config.enabled in Processing

```typescript
// ❌ BAD: Redundant check
if (isPayPeriod(monthId)) {
  const config = getPayPeriodConfig();
  if (config?.enabled) {  // ❌ Unnecessary!
    return processPayPeriod(monthId, config);
  }
}
```

**Why it's bad**: Violates Presence Rule. ID existence proves enablement.

**Fix**: Trust the ID, only check config exists (not enabled).

### ❌ Anti-Pattern 3: Multiple Sync Points

```typescript
// ❌ BAD: Syncing in multiple components
function Component1() {
  useEffect(() => {
    loadPayPeriodConfigFromPrefs({ ... });
  }, [prefs]);
}

function Component2() {
  useEffect(() => {
    loadPayPeriodConfigFromPrefs({ ... });
  }, [prefs]);
}
```

**Why it's bad**: Race conditions, unnecessary syncs, unclear responsibility.

**Fix**: Only sync in one place (main budget component).

### ❌ Anti-Pattern 4: Not Using Singleton

```typescript
// ❌ BAD: Building config manually
const config = {
  enabled: showPayPeriods === 'true',
  payFrequency: frequency,
  startDate: startDate,
};
const display = processWithConfig(month, config);
```

**Why it's bad**: Bypasses singleton, creates dual state.

**Fix**: Use `loadPayPeriodConfigFromPrefs()` to update singleton, then use it.

---

## File Organization

### Core Implementation Files

**`loot-core/src/shared/pay-periods.ts`**
- Core pay period logic and algorithms
- Module singleton `__payPeriodConfig`
- `getPayPeriodConfig()`, `setPayPeriodConfig()` functions
- `loadPayPeriodConfigFromPrefs()` for frontend sync
- Period generation, navigation, and calculation functions

**`loot-core/src/shared/months.ts`**
- Unified month utilities (calendar + pay period)
- All functions use `getPayPeriodConfig()` internally
- No config parameters needed in function signatures
- Simple, clean API

### Backend Integration

**`loot-core/src/server/budgetfiles/app.ts`**
- Calls `loadPayPeriodConfig()` during budget initialization
- Config available via singleton for entire request lifecycle

**`loot-core/src/server/preferences/app.ts`**
- Contains `loadPayPeriodConfig()` function
- Loads config from DB with validation
- Automatically reloads when pay period preferences change
- Calls `setPayPeriodConfig()` to update singleton

### Frontend Components

**Main Budget Component**:
- `desktop-client/src/components/budget/index.tsx`
  - Only place that calls `loadPayPeriodConfigFromPrefs()`
  - Syncs React hooks → module singleton
  - Clear single source of truth

**Other Components**:
- `desktop-client/src/components/budget/MonthPicker.tsx`
- `desktop-client/src/components/budget/envelope/budgetsummary/BudgetSummary.tsx`
- `desktop-client/src/components/budget/tracking/budgetsummary/BudgetSummary.tsx`
- `desktop-client/src/components/mobile/budget/BudgetPage.tsx`

All just use month utils directly - no config management needed.

---

## Testing Strategy

### Backend/Shared Utility Tests

```typescript
import { loadPayPeriodConfigFromPrefs } from 'loot-core/src/shared/pay-periods';
import * as monthUtils from 'loot-core/src/shared/months';

beforeEach(() => {
  loadPayPeriodConfigFromPrefs({
    showPayPeriods: 'true',
    payPeriodFrequency: 'biweekly',
    payPeriodStartDate: '2024-01-05',
  });
});

test('currentMonth returns pay period when enabled', () => {
  const month = monthUtils.currentMonth();
  expect(monthUtils.isPayPeriod(month)).toBe(true);
});

test('bounds works for pay periods', () => {
  const bounds = monthUtils.bounds('2024-13');
  expect(bounds.start).toBe(20240105);
  expect(bounds.end).toBe(20240118);
});
```

---

## Summary

The Pay Periods system uses a **module singleton pattern** for clean, simple architecture:

### Core Achievements

✅ **Single Source of Truth**: Module singleton for both frontend and backend
✅ **Simple API**: Month utils never require config parameters
✅ **Clear Sync Points**: One sync in frontend, automatic reload in backend
✅ **The Presence Rule**: ID existence = proof of enablement
✅ **Performance**: Singleton cached, no config passing overhead
✅ **Backward Compatibility**: Calendar months work unchanged

### Key Principles

1. **Single Source of Truth**: Module singleton only
2. **The Presence Rule**: Pay period ID existence = proof of enablement
3. **Clear Sync Points**: One sync point per context
4. **Simple Function Calls**: No config parameters needed
5. **Fail Fast**: Clear errors better than silent failures

This architecture provides a clean, simple, and performant system for pay period budgeting.
