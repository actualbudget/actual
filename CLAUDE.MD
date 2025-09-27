# Pay Periods Implementation Guide

## Overview

This project implements a **Pay Period** system that extends the traditional calendar month approach to support various pay frequencies (weekly, biweekly, semimonthly, monthly). The system leverages the existing month infrastructure while maintaining clear separation between calendar months and pay periods.

## Core Concept

### Month ID Architecture

The system uses a dual-range month ID approach:

- **Calendar Months**: `YYYY-MM` format where MM = `01-12` (e.g., `2024-01`, `2024-12`)
- **Pay Periods**: `YYYY-MM` format where MM = `13-99` (e.g., `2024-13`, `2024-38`)

This design allows:
- 87 possible pay periods per year (months 13-99)
- Clear distinction between calendar and pay period data
- Reuse of existing month utilities and database schema
- No breaking changes to calendar month functionality

### Pay Period Numbering Logic

**CRITICAL UNDERSTANDING**: Pay period numbers (13-99) represent sequential periods **within each year**, not relative to the start date.

- `YYYY-13` = **First pay period of year YYYY** (regardless of start date)
- `YYYY-14` = **Second pay period of year YYYY**
- `YYYY-15` = **Third pay period of year YYYY**
- And so on...

#### How Start Date Works

The `startDate` configuration is a **reference point for calculating the frequency pattern**, not the period that becomes "13":

**Example: Weekly periods with startDate = 2024-09-26**
1. The 2024-09-26 establishes the weekly cadence (every 7 days)
2. This pattern is projected backward to find periods that fall in January 2024
3. The **first period that starts in January 2024** becomes `2024-13`
4. Subsequent January periods become `2024-14`, `2024-15`, etc.
5. The original 2024-09-26 period might end up being `2024-51` or similar

**Example: Monthly periods with startDate = 2024-09-18**
1. The 2024-09-18 establishes monthly periods starting on the 18th
2. Pattern projected to January: Jan 18 - Feb 17 becomes `2024-13`
3. Feb 18 - Mar 17 becomes `2024-14`, etc.
4. The original Sep 18 period becomes `2024-21` (9th monthly period of year)

This ensures **consistent year-based numbering** regardless of when the user originally configured their start date.

#### Implementation Details

The core algorithm in `computePayPeriodByIndex()` works as follows:

1. **Reference Pattern**: Takes the `startDate` to establish the frequency pattern (e.g., every 14 days for biweekly)
2. **Year Projection**: Projects this pattern backward/forward to find the first period that starts in the target year
3. **Sequential Numbering**: Generates subsequent periods sequentially from that first period

**Example: Weekly periods with startDate = '2024-09-26'**
```typescript
// Input: generatePayPeriods(2024, { startDate: '2024-09-26', payFrequency: 'weekly' })

// Step 1: Establish 7-day pattern from Sep 26
// Step 2: Project backward to find first weekly period starting in Jan 2024
// Step 3: Generate 52 weekly periods starting from that date

// Result: 2024-13 = Jan 4-10, 2024-14 = Jan 11-17, etc. (example dates)
```

This approach was implemented to fix a critical bug where the original logic incorrectly used the start date as period 1, causing inconsistent month ID assignments and mixed range errors.

### Example Pay Period Layouts

Note: These examples show the **first pay periods of 2024** (always starting with `2024-13`), regardless of the original start date configuration.

**Biweekly (26 periods/year) - startDate reference: 2024-01-05**
- `2024-13`: Jan 5 - Jan 18 (1st pay period of 2024)
- `2024-14`: Jan 19 - Feb 1 (2nd pay period of 2024)
- `2024-15`: Feb 2 - Feb 15 (3rd pay period of 2024)
- ...
- `2024-38`: Dec 13 - Dec 26 (26th/final pay period of 2024)

**Semimonthly (24 periods/year) - startDate reference: 2024-01-01**
- `2024-13`: Jan 1 - Jan 15 (1st pay period of 2024)
- `2024-14`: Jan 16 - Jan 31 (2nd pay period of 2024)
- `2024-15`: Feb 1 - Feb 15 (3rd pay period of 2024)
- ...
- `2024-36`: Dec 16 - Dec 31 (24th/final pay period of 2024)

**Monthly (12 periods/year) - startDate reference: 2024-09-18 (projects to Jan 18)**
- `2024-13`: Jan 18 - Feb 17 (1st pay period of 2024)
- `2024-14`: Feb 18 - Mar 17 (2nd pay period of 2024)
- `2024-15`: Mar 18 - Apr 17 (3rd pay period of 2024)
- ...
- `2024-24`: Dec 18 - Jan 17 (12th/final pay period of 2024)

**Key Point**: Even if the user originally set startDate = 2024-09-18, the system calculates backward to find the first monthly period that fits in January 2024, and that becomes `2024-13`.

## Implementation Details

### Configuration System

Pay periods are controlled by three synced preferences:

```typescript
interface PayPeriodConfig {
  enabled: boolean;           // Feature toggle
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  startDate: string;          // ISO date string (e.g., '2024-01-05')
}
```

**Frontend Settings** (`PayPeriodSettings.tsx`):
- Feature flag: `useFeatureFlag('payPeriodsEnabled')`
- User preferences: `useSyncedPref('payPeriodFrequency')`, `useSyncedPref('payPeriodStartDate')`
- Toggle: `useSyncedPref('showPayPeriods')`

**Backend Loading**:
- Budget load: `budgetfiles/app.ts:623` - Loads config during initialization
- Preference changes: `preferences/app.ts:63` - Reloads config when prefs change
- Global state: `pay-periods.ts` - Singleton config accessible to all utilities

### Month Utilities Integration

All existing month utilities work with both types:

```typescript
// Calendar months (when pay periods disabled)
monthUtils.currentMonth()     // → '2024-01'
monthUtils.nextMonth('2024-01') // → '2024-02'
monthUtils.range('2024-01', '2024-04') // → ['2024-01', '2024-02', '2024-03']

// Pay periods (when pay periods enabled)
monthUtils.currentMonth()     // → '2024-15' (current pay period)
monthUtils.nextMonth('2024-13') // → '2024-14'
monthUtils.range('2024-13', '2024-16') // → ['2024-13', '2024-14', '2024-15']
```

**Key Functions**:
- `isPayPeriod(monthId)`: Detects if month ID is 13-99
- `bounds(monthId)`: Returns date range for any month type
- `monthFromDate(date)`: Returns appropriate month ID based on config
- `generatePayPeriods(year, config)`: Creates all pay periods for a year

**Supported Frequencies**:
- **Weekly**: 52 periods per year (every 7 days)
- **Biweekly**: 26 periods per year (every 14 days)
- **Semimonthly**: 24 periods per year (twice per month)
- **Monthly**: 12 periods per year (custom start date each month)

### Defensive Programming

The system includes robust error handling:

```typescript
// Pay period operations without config throw clear errors
monthUtils.bounds('2024-13')
// → Error: "Pay period month '2024-13' cannot be processed without valid pay period configuration"

// Mixed ranges are prevented
monthUtils.range('2024-01', '2024-13')
// → Error: "Mixed calendar month and pay period ranges are not allowed"
```

**Safety Features**:
- Config validation with automatic correction of invalid values
- Graceful fallbacks when pay periods are disabled
- Prevention of mixed calendar/pay period operations
- Clear error messages for debugging

## Development Guidelines

### Adding New Pay Period Features

1. **Always check config first**:
   ```typescript
   const config = getPayPeriodConfig();
   if (config?.enabled && isPayPeriod(monthId)) {
     // Pay period logic
   } else {
     // Calendar month logic
   }
   ```

2. **Use defensive guards**:
   ```typescript
   if (isPayPeriod(monthId)) {
     const config = getPayPeriodConfig();
     if (!config || !config.enabled) {
       throw new Error('Pay period configuration required');
     }
     // Proceed with pay period operations
   }
   ```

3. **Never mix month types**:
   ```typescript
   // ✅ Good: Same types
   range('2024-01', '2024-03')   // All calendar months
   range('2024-13', '2024-15')   // All pay periods

   // ❌ Bad: Mixed types (will throw error)
   range('2024-01', '2024-13')   // Calendar to pay period
   ```

### Testing Approaches

**Unit Tests**: Test individual functions with both month types
```typescript
test('addMonths works for both types', () => {
  // Calendar
  expect(addMonths('2024-01', 1)).toBe('2024-02');

  // Pay periods (with config enabled)
  expect(addMonths('2024-13', 1)).toBe('2024-14');
});
```

**Integration Tests**: Test full workflows with config changes
```typescript
test('config changes reflected immediately', () => {
  loadPayPeriodConfigFromPrefs({ showPayPeriods: 'true', ... });
  expect(currentMonth()).toMatch(/2024-(1[3-9]|[2-9][0-9])/); // Pay period format
});
```

### Common Gotchas

1. **Date Format Confusion**: `bounds()` returns integers (YYYYMMDD), not strings
   ```typescript
   const bounds = monthUtils.bounds('2024-13');
   expect(bounds.start).toBe(20240105); // Integer, not '2024-01-05'
   ```

2. **Config Timing**: Month utilities may be called before config loads
   - Solution: Load config during budget initialization
   - Fallback: Throw clear errors for unconfigured pay periods

3. **Year Boundaries**: Pay periods can span years
   ```typescript
   addMonths('2024-38', 1) // → '2025-13' (next year's first pay period)
   ```

## Database Integration

Pay periods work seamlessly with existing database schema:

- **Transactions**: Store month IDs as integers (e.g., 202413, 202414)
- **Budgets**: Budget entries use same month ID format
- **Queries**: All existing month-based queries work unchanged

Example:
```sql
-- Works for both calendar months and pay periods
SELECT * FROM transactions WHERE month_id >= 202413 AND month_id <= 202415;
```

## Performance Considerations

- **Config Caching**: Configuration is cached globally, not fetched per operation
- **Period Generation**: Pay periods are generated once per year and cached
- **Defensive Guards**: Early validation prevents expensive operations on invalid data

**Benchmarks** (from tests):
- 100 config changes + operations: <1 second
- Year of pay period generation: <10ms
- Month range operations: <1ms each

## Debugging Tips

### Common Issues

1. **Transactions not showing as "spent"**:
   - Check if pay period config loaded: `getPayPeriodConfig()`
   - Verify month IDs match expected format: calendar vs pay period
   - Ensure config enabled when pay period months (13-99) are used

2. **Unexpected range results**:
   - Remember: `monthFromDate()` uses config to determine month type
   - With pay periods enabled, date-to-month conversion gives pay periods
   - Use `isPayPeriod()` to check month type

3. **Config not updating**:
   - Backend loads config on budget load and preference changes
   - Frontend uses `useSyncedPref()` - changes trigger backend reload
   - Check console for config loading logs: `[PayPeriod]`

### Logging

The system includes extensive logging for debugging:

```
[PayPeriod] Loading pay period config during budget load...
[PayPeriod] Successfully loaded config: { enabled: true, payFrequency: 'biweekly', ... }
[PayPeriod] Range request for pay periods: { start: '2024-13', end: '2024-16' }
```

## Debugging Systematic Issues: Lessons Learned

### Root Cause Analysis Approach

When encountering mixed month type errors, follow this systematic debugging approach:

#### 1. Identify Symptoms vs. Root Cause
- **Symptom**: "Mixed calendar month and pay period ranges are not allowed"
- **Wrong approach**: Add more validation to prevent mixed ranges
- **Right approach**: Find WHY mixed ranges are being created in the first place

#### 2. Trace Data Flow Systematically
When debugging month type issues:
1. **Start at the error point**: Where exactly is the mixed range detected?
2. **Work backwards**: What function created the mixed values?
3. **Find the source**: Where do calendar months enter a pay period flow (or vice versa)?

**Example from recent fix**:
```
Error in: MonthsProvider → rangeInclusive('2025-31', '2027-07')
↑ Mixed range
Caused by: addMonths('2025-31', n) → returned '2027-07' (calendar month)
↑ Wrong output type
Root cause: addMonths() falling back to calendar arithmetic for pay period input
```

#### 3. Apply the "Presence Rule"
**Key Insight**: If a pay period month ID (like `'2025-31'`) enters a function, that is PROOF that pay periods are enabled. The presence of the pay period ID IS the config check.

**Before (dangerous pattern)**:
```typescript
if (isPayPeriod(monthStr)) {
  const config = getPayPeriodConfig();
  if (config?.enabled) {
    return payPeriodFunction(monthStr, config);
  }
}
// ❌ DANGEROUS: Unsafe fallback to calendar logic
return calendarFunction(monthStr);
```

**After (safe pattern)**:
```typescript
if (isPayPeriod(monthStr)) {
  return payPeriodFunction(monthStr); // Self-contained
}
return calendarFunction(monthStr);
```

#### 4. Eliminate Config Parameter Passing
Pay period functions should get their config internally rather than requiring it as a parameter:

```typescript
// ❌ Before: Config passed around
function addPayPeriods(monthId: string, n: number, config: PayPeriodConfig) { ... }

// ✅ After: Config retrieved internally
function addPayPeriods(monthId: string, n: number) {
  const config = getPayPeriodConfig();
  if (!config?.enabled) {
    throw new Error(`Pay period ${monthId} requires enabled config`);
  }
  // ... rest of logic
}
```

### Systematic Fix Strategy

1. **Phase 1**: Make pay period functions self-contained
   - Remove config parameters
   - Add internal config validation with clear errors
   - Functions fail fast rather than falling back

2. **Phase 2**: Simplify calling code
   - Remove redundant config checks
   - Remove unsafe fallback paths
   - Use clean `if (isPayPeriod) return payPeriodFn()` pattern

### Testing Strategy for Systematic Issues

**Create Reproduction Tests First**:
```typescript
test('Should reproduce exact error scenario', () => {
  // Test the specific values from the error message
  expect(() => {
    monthUtils.rangeInclusive('2025-31', '2027-07');
  }).toThrow('Mixed calendar month and pay period ranges');
});
```

**Test the Fix, Not Just the Symptoms**:
```typescript
test('Pay period functions never return calendar months', () => {
  const result = monthUtils.addMonths('2025-31', 50);
  expect(monthUtils.isPayPeriod(result)).toBe(true);
  expect(result).not.toMatch(/^\d{4}-(0[1-9]|1[0-2])$/); // Not calendar format
});
```

### Key Principles

1. **Trace to the Source**: Don't fix symptoms, fix the root cause
2. **Trust the Type**: If you have a pay period ID, pay periods must be enabled
3. **Fail Fast**: Clear errors are better than silent failures or unsafe fallbacks
4. **Self-Contained Functions**: Functions should manage their own requirements
5. **Test the Invariant**: Ensure the fundamental rule (pay period in = pay period out) holds

These lessons prevent the need for complex validation layers by ensuring the problem can never occur in the first place.

## Single Source of Truth: Architecture Lessons Learned

### The Core Principle

**If a pay period ID exists in the system, that IS proof that pay periods are enabled.**

This principle eliminates race conditions and creates a clean architectural separation between ID generation and ID processing.

### Sources of Truth Analysis

#### **ID Generation Points** (Should check config.enabled):
- `currentMonth()` in months.ts - THE decision point that returns pay period ID only if enabled
- `monthFromDate()` in months.ts - Converts dates to appropriate month type based on config

These functions are the **gatekeepers** that decide whether to generate pay period IDs or calendar month IDs.

#### **ID Processing Points** (Should trust the ID type):
- All pay period utility functions should trust that if they receive a pay period ID, it's valid
- No need to check `config.enabled` - the presence of the ID IS the check

### Implementation Strategy

**Before (Violates Single Source of Truth)**:
```typescript
// ❌ BAD: Processing function checking enabled state
function computePayPeriodByIndex(periodIndex, config, year) {
  if (!config || !config.enabled) {
    throw new Error('Pay period config disabled');
  }
  // ... processing logic
}
```

**After (Follows Single Source of Truth)**:
```typescript
// ✅ GOOD: Processing function trusts the ID
function computePayPeriodByIndex(periodIndex, config, year) {
  // Trust that if this function is called, pay periods are enabled
  // The ID generation point already made this determination
  // ... processing logic
}
```

### Frontend/Backend Alignment

**Frontend Sources of Truth**:
- Feature Flag: `useFeatureFlag('payPeriodsEnabled')`
- User Preference: `useSyncedPref('showPayPeriods')`
- Combined in budget component: `config.enabled = featureFlag && showPayPeriods`

**Backend Sources of Truth**:
- Budget Load: Loads config from DB preferences during startup
- Preference Changes: Reloads config when user changes settings

**Critical Flow**:
1. Config determines enabled state
2. `currentMonth()` uses config to decide ID type
3. Pay period IDs flow through entire system
4. Processing functions trust the ID type

### Functions Fixed

**Critical Functions** (Were throwing errors during initialization):
- `computePayPeriodByIndex()` - Removed config.enabled check
- `bounds()` - Removed config.enabled check
- `getMonthStartDate()` - Removed config.enabled check
- `getMonthEndDate()` - Removed config.enabled check
- `resolveMonthRange()` - Removed config.enabled check
- `_range()` - Removed config.enabled check

**Supporting Functions**:
- `generatePayPeriods()` - Removed config.enabled check
- `getPayPeriodCountForMonth()` - Removed config.enabled check
- `getPayPeriodNumberInMonth()` - Removed config.enabled check
- Label functions - Simplified config logic

### Key Benefits

1. **Eliminates Race Conditions**: No more initialization timing issues
2. **Cleaner Architecture**: Clear separation between decision and processing
3. **Better Error Messages**: Failures are more specific and actionable
4. **Maintainability**: Easier to reason about and modify
5. **Performance**: Fewer redundant config checks

### Testing Strategy for Single Source of Truth

```typescript
test('Pay period functions trust ID presence', () => {
  // If a pay period ID exists, functions should process it
  const result = somePayPeriodFunction('2024-15');
  expect(result).toBeDefined();
  // No config.enabled checks needed
});

test('ID generation respects config', () => {
  setConfig({ enabled: false });
  expect(currentMonth()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/); // Calendar month

  setConfig({ enabled: true });
  expect(currentMonth()).toMatch(/^\d{4}-(1[3-9]|[2-9][0-9])$/); // Pay period
});
```

### Architecture Rule

**Single Source of Truth Rule**: Only one place should determine whether pay periods are enabled for a given context. All downstream functions should trust that determination.

This approach creates a robust, maintainable system where the presence of pay period IDs serves as the definitive proof that pay periods are active.

## Future Enhancements
### Architecture Improvements
- **Type Safety**: Branded types to prevent calendar/pay period mixing at compile time
- **Performance**: Lazy loading of pay period generations
- **Validation**: More sophisticated date validation for edge cases

## Testing Strategy

The codebase includes comprehensive test coverage:

- **Config Timing Tests** (`pay-period-config-timing.test.ts`): 11 tests
- **Mixed Range Prevention** (`pay-period-mixed-range-prevention.test.ts`): 11 tests
- **Core Functionality** (`pay-periods.test.ts`): 10 tests
- **Integration Tests** (`months.test.ts`): 6 pay period tests

**Total: 38 pay period tests ensuring robust functionality**

Run tests with:
```bash
yarn test:node src/shared/pay-period*.test.ts src/shared/months.test.ts
```

## Summary

The Pay Periods system successfully extends Actual's month-based budgeting to support various pay frequencies while maintaining:

- ✅ **Backward Compatibility**: Calendar months (01-12) work unchanged
- ✅ **Clear Separation**: Pay periods (13-99) are distinct and identifiable
- ✅ **Robust Error Handling**: Defensive guards prevent silent failures
- ✅ **Performance**: Cached config and efficient period generation
- ✅ **Flexibility**: Support for weekly, biweekly, semimonthly, and monthly frequencies
- ✅ **Type Safety**: Prevention of mixed month type operations

This approach allows users to budget based on their actual pay schedule while leveraging all existing Actual functionality.