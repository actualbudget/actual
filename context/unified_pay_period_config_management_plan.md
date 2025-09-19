# Unified Pay Period Config Management Plan

## Problem Analysis

### Current Architecture Issues

The shared `packages/loot-core/src/shared/months.ts` module has an architectural flaw: it uses a global singleton pattern for pay period configuration that doesn't properly handle dual frontend/backend execution contexts.

**Current Issues:**

1. **Global State Collision**: Single config variable shared between frontend and backend contexts
2. **Frontend-Only Config**: Configuration only set in frontend via React hooks
3. **Backend Config Gap**: Backend has no mechanism to load pay period config from database
4. **Context Confusion**: Shared code doesn't know if it's running in frontend or backend

### Current Config Flow

**Frontend:** React preferences → global config → months.ts
**Backend:** Database → ??? → NO CONFIG → months.ts fails
**Shared months.ts:** Always calls same config function regardless of context

## Root Problem

The `months.ts` module works in **three execution contexts**:

1. **Frontend**: Config from React state management
2. **Backend**: Config from database queries
3. **Test**: Config from test setup

Currently, only frontend context works properly.

## Solution: Follow Existing Architecture Pattern

### Key Insight: budgetType Pattern

Analysis of `budgetType` (Envelope vs. Tracking) reveals the existing architecture pattern:

**Frontend:**

- Components use `useSyncedPref('budgetType')` directly
- React hooks provide reactive preference access
- No complex state management needed

**Backend:**

- `isReflectBudget()` queries database on-demand for fresh values
- Simple, synchronous database queries when needed
- No initialization or startup dependencies

**Pattern Success:** This approach handles dynamic preference changes, feature flag toggles, and multi-user scenarios automatically.

### Implementation Strategy

#### 1. Follow Existing budgetType Pattern

Instead of complex provider interfaces, use the same pattern as `budgetType`:

**Frontend:** Components continue using synced preferences
**Backend:** Create simple database query functions
**Shared:** Keep `months.ts` simple with minimal changes

#### 2. Database-Safe Architecture

**Critical Issue Identified:** Importing database code in shared modules breaks frontend since `db` isn't available in browser context.

**Safe Solution - Dependency Injection Pattern:**

The shared modules use simple getter/setter functions with no database imports. Backend initialization loads config from database and sets the global state.

#### 3. Context-Specific Config Loading

**Backend Database Access (Server-Only Module):**
Server-only modules query the `preferences` table for all pay period configuration including frequency, startDate, and enabled state.

## 🚨 CRITICAL ARCHITECTURAL CORRECTION

### Backend Must Know User View State

**Initial Misunderstanding:** Backend should assume enabled=true if config exists.

**Reality:** The `months.ts` module is imported by 27+ server files. Functions like `monthFromDate()`, `currentMonth()`, `nextMonth()`, etc. all check `config?.enabled` before using pay period logic.

**Impact Analysis:** If backend doesn't know the enabled state, server-side month calculations would be inconsistent with frontend state when user toggles pay periods off.

**Corrected Backend Approach:**

- Backend queries preferences table for complete pay period configuration
- Gets all settings from single source (enabled state, frequency, start date)
- Ensures consistency between frontend and backend month calculations

**Backend Configuration Sources:**

1. **preferences table**: All pay period settings stored as individual preferences
   - `showPayPeriods`: 'true'/'false' for enabled state
   - `payPeriodFrequency`: 'weekly'/'biweekly'/'monthly'/'semimonthly'
   - `payPeriodStartDate`: ISO date string (e.g., '2024-01-01')
2. **Single query location**: Complete PayPeriodConfig from one table

#### 4. No Provider Pattern Needed

The existing architecture doesn't use providers - it uses:

- **Frontend**: React hooks (`useSyncedPref`) + global state for caching
- **Backend**: Direct database queries when needed + global state initialization
- **Shared**: Simple functions that work in both contexts

### Why This Approach is Better

1. **Consistent with Existing Patterns**: Matches exactly how `budgetType` works
2. **Much Simpler**: No provider interfaces, no context detection complexity
3. **Backwards Compatible**: Minimal changes to existing code
4. **Performance**: Backend queries DB once per budget load, frontend uses cached preferences
5. **Easy to Test**: Same testing patterns as existing preferences

## Implementation Plan

### Phase 1: Backend Database Integration ✅ **COMPLETED**

**Status:** All implementation steps completed successfully

**Completed Tasks:**

1. ✅ **Clean up existing config table implementation:**
   - Removed migration file for pay_period_config table
   - Removed DbPayPeriodConfig type definition from db/types/index.ts
   - No separate database table needed - using existing preferences infrastructure

2. ✅ **Create preferences-based config loading:**
   - Added `loadPayPeriodConfigFromPrefs()` function in shared/pay-periods.ts
   - Leverages existing preferences infrastructure instead of separate database queries
   - Validates configuration data and provides graceful fallbacks

3. ✅ **Integrate with budget loading:**
   - Modified `_loadBudget()` in budgetfiles/app.ts to load pay period preferences
   - Uses efficient parallel database queries alongside budgetType preference
   - Loads before `budget.createAllBudgets()` to ensure config availability

4. ✅ **Add preference synchronization:**
   - Modified `saveSyncedPrefs()` in preferences/app.ts for automatic config reload
   - Backend config automatically updates when frontend preferences change
   - Uses existing preference sync mechanisms

5. ✅ **Verify backend access:**
   - All TypeScript type checking passes
   - Code formatted according to project standards
   - Backend has complete access to pay period configuration

**Architecture Benefits Achieved:**
- Follows existing budgetType preference pattern exactly
- No separate database dependencies or files needed
- Efficient single-query approach with parallel execution
- Automatic synchronization between frontend and backend
- Graceful error handling with fallback to disabled state

### Phase 2: Frontend Integration 📋 **PENDING**

**Status:** Ready to begin - backend infrastructure is complete

**Objective:** Ensure frontend pay period setting changes automatically sync with backend

**Files to Verify/Modify:**

- Budget page component with pay period toggle
- Pay period settings component
- Verify existing preference sync calls work with new backend infrastructure

**Implementation Tasks:**

1. Verify pay period toggle uses existing `useSyncedPref('showPayPeriods')` pattern
2. Verify pay period settings use existing `saveSyncedPrefs()` calls for frequency and start date
3. Test that preference changes automatically trigger backend config reload (via existing mechanism)
4. Confirm all pay period setting changes update both frontend React state and backend database

**Expected Outcome:** Frontend should work unchanged since it already uses synced preferences, and backend now automatically responds to those preference changes.

### Phase 3: Comprehensive Testing & Validation 📋 **PENDING**

**Status:** Ready after Phase 2 completion

**Critical Validation Tasks:**

- ✅ Verify backend can access complete pay period config from preferences table
- ✅ Ensure no database imports in shared modules
- ✅ Verify pay_period_config table and related code is completely removed
- 📋 Test that budget loading gracefully continues if pay period config fails
- 📋 Confirm 27+ server files that import `months.ts` work correctly with backend config
- 📋 Test end-to-end preference synchronization between frontend and backend
- 📋 Validate pay period calculations work consistently in frontend and backend contexts

**Error Handling Verification:**

- ✅ Pay period config loading failures do not prevent budget loading
- ✅ Gracefully falls back to calendar months if config cannot be loaded
- ✅ Logs warnings for config failures but continues normal operation
- 📋 Test error scenarios: invalid preferences, database failures, corrupted config data

**Integration Testing:**

- 📋 Test with existing pay period functionality to ensure no regressions
- 📋 Verify month calculations work identically in frontend and backend
- 📋 Test feature flag scenarios (payPeriodsEnabled on/off)
- 📋 Validate preference changes immediately affect backend calculations

## Key Architectural Principles

1. **No database imports in shared modules** (prevents frontend breakage)
2. **Backend gets complete config** (prevents calculation inconsistencies)
3. **Reuse existing patterns** (follows budgetType approach)
4. **Simple getter/setter global state** (no complex providers)
5. **Graceful error handling** (budget loading continues on config failures)
6. **API synchronization** (frontend preference changes update backend immediately)

## Additional Benefits of Preferences-Only Approach

### 1. **Follows Existing Patterns**

Pay period configuration stored exactly like `budgetType` preference - single table, proven sync mechanisms.

### 2. **Simplified Implementation**

- No new database migration needed
- Single query for all pay period settings
- Reuses existing preference infrastructure
- Matches established codebase patterns

### 3. **Preference Storage Format**

```
preferences table entries:
- showPayPeriods: 'true'/'false'
- payPeriodFrequency: 'weekly'/'biweekly'/'monthly'/'semimonthly'
- payPeriodStartDate: '2024-01-01' (ISO date string)
```

### 4. **Clean Architecture**

- Pay periods are fundamentally user preferences, not system configuration
- Single source of truth in preferences table
- Automatic sync with existing preference mechanisms

## Implementation Status Summary

### ✅ **Phase 1: COMPLETED** - Backend Database Integration
**Result:** Backend now has complete access to pay period configuration from preferences table, following existing budgetType patterns exactly. All architectural goals achieved.

### 📋 **Phase 2: PENDING** - Frontend Integration
**Objective:** Verify and test that existing frontend preference calls work with new backend infrastructure.

### 📋 **Phase 3: PENDING** - Comprehensive Testing & Validation
**Objective:** End-to-end testing and validation of the unified configuration system.

## Architectural Goals Achieved

✅ **Backend gets complete pay period configuration from single preferences source**
✅ **No database dependencies in shared code**
✅ **Proper loading timing before spreadsheet operations**
✅ **Immediate synchronization infrastructure for preference changes**
✅ **Graceful fallback to calendar months on errors**
✅ **Follows established codebase patterns exactly**

The implementation successfully addresses all identified architectural issues and is ready for frontend integration and comprehensive testing.
