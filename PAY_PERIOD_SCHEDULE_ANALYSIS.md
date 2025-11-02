# Root Cause Analysis: Pay Periods Not Working with Schedule-Based Budget Templates

**Branch Analyzed:** `pay_periods_13_99_unified_configs`
**Date:** 2025-10-29
**Issue:** Pay periods (13-99) fail to work correctly with Schedule-based budget templates

---

## Executive Summary

The newly introduced pay periods fail when used with Schedule-based budget templates because **critical date/time utility functions don't handle pay period IDs correctly**. These functions incorrectly parse pay period IDs like `"2024-13"` as invalid calendar dates (e.g., month 13 becomes January of the next year), causing schedule calculations to fail.

---

## The Root Cause

### Location
`packages/loot-core/src/shared/date-utils.ts:66-67`

### The Problem

When a pay period ID like `"2024-13"` (first pay period of 2024) is parsed by the shared date parsing utility:

```typescript
const [year, month, day] = value.split('-');
// year = "2024", month = "13", day = undefined

if (day != null) {
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12);
} else if (month != null) {
  return new Date(parseInt(year), parseInt(month) - 1, 1, 12);
  // Creates: new Date(2024, 12, 1, 12)
  // JavaScript month 12 (0-indexed) = January 2025!
}
```

**Result:**
- `"2024-13"` → Parsed as **January 1, 2025** ❌
- `"2024-14"` → Parsed as **February 1, 2025** ❌
- `"2024-15"` → Parsed as **March 1, 2025** ❌
- And so on...

The first pay period of 2024 gets incorrectly treated as **January 2025**, not as its actual date range (which could be any dates depending on the pay period configuration).

---

## Impact on Schedule Templates

### How Schedules Use Date Calculations

The schedule template code (`packages/loot-core/src/server/budget/schedule-template.ts`) relies heavily on date difference calculations to determine:

1. Whether a schedule is in the past or future
2. How much to budget for recurring schedules
3. The interval between schedule occurrences

### Critical Failure Points

#### 1. **Schedule Date Validation** (schedule-template.ts:84-90)

```typescript
const num_months = monthUtils.differenceInCalendarMonths(
  next_date_string,  // e.g., "2024-01-15" (a schedule in January 2024)
  current_month,      // e.g., "2024-13" → incorrectly parsed as Jan 2025!
);

if (num_months < 0) {
  // This incorrectly triggers!
  // Jan 2024 - Jan 2025 = -12 months
  errors.push(`Schedule ${template.name} is in the Past.`);
}
```

When budgeting for pay period `"2024-13"` (which might actually be in January 2024):
- Schedule's next date: `"2024-01-15"` → Parsed as January 15, 2024
- Current month: `"2024-13"` → **Incorrectly** parsed as January 1, 2025
- Difference: `Jan 2024 - Jan 2025 = -12 months`
- Result: Schedule is incorrectly marked as "in the past" and excluded! ❌

#### 2. **Interval Calculations** (schedule-template.ts:212-234)

For weekly/daily schedules, the code calculates the interval in months:

```typescript
// For weekly schedules (line 212-218)
prevDate = monthUtils.subWeeks(
  schedule.next_date_string,
  schedule.target_interval,
);
intervalMonths = monthUtils.differenceInCalendarMonths(
  schedule.next_date_string,
  prevDate,
);
```

This calculation fails when the current month is a pay period because:
- `subWeeks` doesn't understand pay periods
- `differenceInCalendarMonths` incorrectly parses pay period IDs

---

## Why It Works for Some Schedules

The bug manifests inconsistently because the incorrect parsing sometimes "accidentally" works:

### ✅ Works When:
- Schedule date happens to fall in a range where the misparsed pay period date still makes the calculation correct
- The schedule is far enough in the future that `num_months` stays positive despite the parsing error
- Example: If current pay period is `"2024-13"` (parsed as Jan 2025), a schedule for `"2025-06-15"` would have `num_months = 5` months (June 2025 - Jan 2025), which might still work

### ❌ Fails When:
- Schedule date falls within the "misparsed" date range, making `num_months < 0`
- Schedule appears to be in the past when it's actually current/future
- Example: Pay period `"2024-13"` (parsed as Jan 2025) with schedule on `"2024-01-15"` calculates as -12 months

---

## Affected Functions

The following functions in `packages/loot-core/src/shared/months.ts` **DO NOT handle pay periods** but are used by schedule templates:

| Function | Line | Used By Schedules | Severity | Status |
|----------|------|-------------------|----------|--------|
| `differenceInCalendarMonths` | 170-175 | ✅ Lines 84, 216, 229 | 🔴 CRITICAL | ✅ FIXED |
| `differenceInCalendarDays` | 177-182 | ✅ Line 141 | 🔴 HIGH | ✅ FIXED |
| `addWeeks` | 166-168 | ✅ Line 320 | 🟡 MEDIUM | ✅ FIXED |
| `subWeeks` | 195-197 | ✅ Line 212 | 🟡 MEDIUM | ✅ FIXED |
| `addDays` | 203-205 | ✅ Line 127 | 🟡 MEDIUM | ✅ FIXED |
| `subDays` | 207-209 | ✅ Line 225 | 🟡 MEDIUM | ✅ FIXED |

---

## Functions Already Handling Pay Periods Correctly

These functions in `months.ts` **already handle pay periods** using the established pattern:

✅ `nextMonth` - Checks `isPayPeriod()` and calls `nextPayPeriod()`
✅ `prevMonth` - Checks `isPayPeriod()` and calls `prevPayPeriod()`
✅ `addMonths` - Checks `isPayPeriod()` and calls `addPayPeriods()`
✅ `subMonths` - Checks `isPayPeriod()` and calls `addPayPeriods()` with negative n
✅ `bounds` - Checks `isPayPeriod()` and uses `generatePayPeriods()`
✅ `_range` - Checks `isPayPeriod()` and calls `generatePayPeriodRange()`

---

## Implemented Solutions

### 1. Fixed `differenceInCalendarMonths` ✅

Converts pay periods to their actual date ranges before calculating differences:

```typescript
export function differenceInCalendarMonths(
  month1: DateLike,
  month2: DateLike,
): number {
  const str1 = typeof month1 === 'string' ? month1 : d.format(_parse(month1), 'yyyy-MM');
  const str2 = typeof month2 === 'string' ? month2 : d.format(_parse(month2), 'yyyy-MM');

  // If either is a pay period, convert to actual start dates
  if (isPayPeriod(str1) || isPayPeriod(str2)) {
    const config = getPayPeriodConfig();
    const date1 = isPayPeriod(str1) ? getMonthStartDate(str1, config) : _parse(month1);
    const date2 = isPayPeriod(str2) ? getMonthStartDate(str2, config) : _parse(month2);
    return d.differenceInCalendarMonths(date1, date2);
  }

  return d.differenceInCalendarMonths(_parse(month1), _parse(month2));
}
```

### 2. Fixed `differenceInCalendarDays` ✅

Similar approach - converts pay periods to actual dates:

```typescript
export function differenceInCalendarDays(
  month1: DateLike,
  month2: DateLike,
): number {
  const str1 = typeof month1 === 'string' ? month1 : d.format(_parse(month1), 'yyyy-MM-dd');
  const str2 = typeof month2 === 'string' ? month2 : d.format(_parse(month2), 'yyyy-MM-dd');

  if (isPayPeriod(str1) || isPayPeriod(str2)) {
    const config = getPayPeriodConfig();
    const date1 = isPayPeriod(str1) ? getMonthStartDate(str1, config) : _parse(month1);
    const date2 = isPayPeriod(str2) ? getMonthStartDate(str2, config) : _parse(month2);
    return d.differenceInCalendarDays(date1, date2);
  }

  return d.differenceInCalendarDays(_parse(month1), _parse(month2));
}
```

### 3. Fixed Week/Day Arithmetic Functions ✅

For `addWeeks`, `subWeeks`, `addDays`, `subDays` - converted pay period IDs to their start date before performing operations:

```typescript
export function addWeeks(date: DateLike, n: number): string {
  // Convert pay period to its start date before performing week arithmetic
  const dateStr = typeof date === 'string' ? date : d.format(_parse(date), 'yyyy-MM-dd');

  if (isPayPeriod(dateStr)) {
    const config = getPayPeriodConfig();
    const startDate = getMonthStartDate(dateStr, config);
    return d.format(d.addWeeks(startDate, n), 'yyyy-MM-dd');
  }

  return d.format(d.addWeeks(_parse(date), n), 'yyyy-MM-dd');
}
```

---

## Testing Strategy

After implementing fixes, test with:

1. **Schedule in same calendar month as pay period:**
   - Pay period: `"2024-13"` (e.g., Jan 1-14, 2024)
   - Schedule: Next date `"2024-01-10"`
   - Expected: Schedule should be recognized as current/upcoming

2. **Schedule in future calendar month:**
   - Pay period: `"2024-13"` (e.g., Jan 1-14, 2024)
   - Schedule: Next date `"2024-03-15"`
   - Expected: Correct month difference calculation

3. **Weekly/Daily schedules:**
   - Verify interval calculations work correctly
   - Ensure monthly targets are calculated properly

4. **Edge cases:**
   - Pay period spanning month boundary
   - Multiple pay periods in same calendar month
   - Different pay frequencies (weekly, biweekly, semimonthly, monthly)

---

## Files Changed

### Primary Changes
1. `packages/loot-core/src/shared/months.ts`
   - ✅ Fixed `differenceInCalendarMonths` (line 179-201)
   - ✅ Fixed `differenceInCalendarDays` (line 203-225)
   - ✅ Fixed `addWeeks` (line 166-177)
   - ✅ Fixed `subWeeks` (line 238-249)
   - ✅ Fixed `addDays` (line 255-266)
   - ✅ Fixed `subDays` (line 268-279)

---

## Conclusion

The pay period feature is well-architected with clear separation between calendar months and pay periods. The issue was that **not all month utility functions were updated to handle pay periods**. The fix follows the established pattern already used successfully in functions like `addMonths`, `nextMonth`, etc.

**Priority:** HIGH - This breaks a critical budgeting feature (schedule-based templates) when pay periods are enabled.

**Complexity:** LOW - The fix pattern is already established in the codebase.

**Risk:** LOW - Changes are isolated to utility functions with clear test coverage paths.

**Status:** ✅ FIXED - All affected functions have been updated to properly handle pay period IDs.
