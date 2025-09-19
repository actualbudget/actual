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

### Phase 1: Backend Database Integration (1-2 days)

**Files to Create:**
- `packages/loot-core/src/server/pay-period-db.ts` - Database access functions

**Files to Remove/Clean Up:**
- `packages/loot-core/migrations/1757000000000_add_pay_period_config.sql` - Remove pay_period_config table migration
- Remove `DbPayPeriodConfig` type from `packages/loot-core/src/server/db/types/index.ts`

**Files to Modify:**
- `packages/loot-core/src/shared/pay-periods.ts` - Keep simple getter/setter, no database imports
- `packages/loot-core/src/server/budgetfiles/app.ts` - Initialize config during budget loading
- Add new API handler for syncing preference changes from frontend

**Implementation Steps:**
1. **Clean up existing config table implementation:**
   - Remove migration file for pay_period_config table
   - Remove DbPayPeriodConfig type definition
   - Delete any existing pay_period_config table data (if created)
2. Create `loadPayPeriodConfigFromDB()` function that queries preferences table for all pay period settings
3. Load config in `_loadBudget()` after database opens but before spreadsheet operations
4. Add API handler to update preferences when frontend changes any pay period setting
5. Test that backend has access to complete pay period configuration

**Critical Timing:** Config must load before `sheet.loadSpreadsheet()` call because spreadsheet operations invoke `months.ts` functions that check pay period config.

### Phase 2: Frontend Integration (1 day)

**Files to Modify:**
- Budget page component with pay period toggle
- Pay period settings component
- Add API calls when any pay period setting changes to sync preferences to backend

**Implementation:**
1. Modify pay period toggle and settings handlers to call new API endpoint
2. Ensure all preference changes (enabled, frequency, start date) update both frontend React state and backend database
3. Test that any pay period setting change updates backend config immediately

**Note:** Existing frontend pay period functionality should continue working unchanged.

### Phase 3: Error Handling & Testing (1 day)

**Validation:**
- Verify backend can access complete pay period config from preferences table
- Ensure no database imports in shared modules
- Test that budget loading gracefully continues if pay period config fails
- Confirm 27+ server files that import `months.ts` work correctly
- Test preference synchronization between frontend and backend for all pay period settings
- Verify pay_period_config table and related code is completely removed

**Error Handling Strategy:**
- Pay period config loading failures should not prevent budget loading
- Gracefully fall back to calendar months if config cannot be loaded
- Log warnings for config failures but continue normal operation

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

## Ready for Implementation

The plan addresses all identified issues:
- Backend gets complete pay period configuration from single preferences source
- No database dependencies in shared code
- Proper loading timing before spreadsheet operations
- Immediate synchronization of all preference changes
- Graceful fallback to calendar months on errors
- Follows established codebase patterns exactly