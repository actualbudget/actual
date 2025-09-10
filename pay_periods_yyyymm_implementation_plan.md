# Pay Period Dates Implementation Plan

## Overview
The current system assumes all month identifiers follow the YYYY-MM format where MM is 01-12. However, pay periods will use months 13-99 (e.g., 2024-13, 2024-14, etc.) which are not real calendar months. This creates significant challenges across the entire budget system that must be addressed systematically.

## File Analysis
Based on the codebase analysis, the following core files are affected by the month format change:

### Core Infrastructure
- `packages/loot-core/src/shared/months.ts` - Core month utilities and validation
- `packages/loot-core/src/shared/pay-periods.ts` - Pay period configuration and logic
- `packages/loot-core/src/server/budget/actions.ts` - Database month conversion (`dbMonth` function)
- `packages/loot-core/src/server/api.ts` - Month validation (`validateMonth` function)

### Spreadsheet System
- `packages/loot-core/src/server/sheet.ts` - Sheet name generation
- All budget action files that use `sheetForMonth()` (60+ references)

### UI Components
- `packages/desktop-client/src/components/budget/MonthPicker.tsx` - Month navigation UI
- `packages/desktop-client/src/components/budget/index.tsx` - Budget page orchestrator
- `packages/desktop-client/src/components/budget/DynamicBudgetTable.tsx` - Month range handling
- `packages/desktop-client/src/components/budget/MonthsContext.tsx` - Month context provider

### Database Layer
- `packages/loot-core/src/server/db/types/index.ts` - Database schema types
- All budget tables that store month as integer (`zero_budgets`, `reflect_budgets`)

## Assumptions
### Database Storage Specific Concerns
- **Integer Storage**: Budget tables (`zero_budgets`, `reflect_budgets`) store month as `f('integer')` 
  - Current: "2024-01" → 202401, "2024-12" → 202412
  - Pay periods: "2024-13" → 202413, "2024-14" → 202414, etc.
  - **OPPORTUNITY**: Integer storage is flexible and can handle 202413+ values without schema changes
- **ID Generation**: Budget records use `${dbMonth(month)}-${category}` format for IDs
  - Current: "202401-category123", "202412-category123"  
  - Pay periods: "202413-category123", "202414-category123"
  - **OPPORTUNITY**: ID format remains consistent and unique across calendar/pay period months
- **Query Compatibility**: All existing month-based queries will work with pay period integers
  - **OPPORTUNITY**: No database migration needed - existing queries handle larger integers

### Spreadsheet Naming Specific Concerns  
- **Sheet Name Pattern**: `sheetForMonth()` generates "budget" + month.replace('-', '')
  - Current: "2024-01" → "budget202401", "2024-12" → "budget202412"
  - Pay periods: "2024-13" → "budget202413", "2024-14" → "budget202414"
  - **OPPORTUNITY**: Pattern remains consistent and creates unique sheet names
- **Sheet Cleanup**: Budget type changes delete sheets matching `/^budget\d+/` pattern
  - **OPPORTUNITY**: Existing cleanup logic will handle pay period sheets automatically
- **Cell References**: All 60+ references to `sheetForMonth()` will work with pay period months
  - **OPPORTUNITY**: No changes needed to existing spreadsheet cell generation

## High-Level Impact

### Architecture Changes
- **Date Arithmetic**: Month addition/subtraction logic needs pay period awareness
- **Range Generation**: Month ranges need to handle non-calendar sequences

### Data Flow Changes
- **UI → State**: Month picker needs to display pay period labels instead of calendar months
- **State → Backend**: Month validation must accept pay period format
- **Backend → Database**: Month conversion must handle pay period integers
- **Database → Spreadsheet**: Sheet names must be unique and meaningful for pay periods

### User Experience Impact
- **Navigation**: Month picker shows "Dec 31 - Jan 14" for pay periods (with "P1" fallback for small spaces)
- **Display**: All month references need pay period-aware formatting with localized date ranges
- **Validation**: Error messages must distinguish between calendar months and pay periods
- **Backward Compatibility**: Existing calendar month data must continue working

## Phased Implementation

### Phase 1: Core Infrastructure Updates
**Priority**: Critical
**Status**: 100% Complete ✅

#### Files to Modify
- ✅ `packages/loot-core/src/shared/months.ts` - **COMPLETE** - Pay period integration implemented
- ✅ `packages/loot-core/src/shared/pay-periods.ts` - **COMPLETE** - Full pay period system implemented
- ✅ `packages/loot-core/src/server/budget/actions.ts` - **NO CHANGES NEEDED** - `dbMonth()` already works
- ✅ `packages/loot-core/src/server/api.ts` - **NO CHANGES NEEDED** - `validateMonth()` already works

#### Implementation Details
- ✅ **COMPLETE**: Pay period-aware month conversion functions implemented
- ✅ **COMPLETE**: Month arithmetic (addMonths, subMonths, nextMonth, prevMonth) supports pay periods
- ✅ **COMPLETE**: Month range generation supports pay periods
- ✅ **COMPLETE**: Pay period detection and validation implemented
- ✅ **COMPLETE**: Backward compatibility with calendar months maintained
- ✅ **VERIFIED**: `dbMonth()` already handles pay period integers (e.g., 202413, 202414)
- ✅ **VERIFIED**: `validateMonth()` regex already accepts 13-99 range
- ✅ **COMPLETE**: Comprehensive unit tests for edge cases implemented

### Phase 2: Spreadsheet System Updates
**Priority**: Low (Minimal Changes Needed)
**Status**: 100% Complete

#### Files to Modify
- ✅ `packages/loot-core/src/server/sheet.ts` - **VERIFIED** - Sheet name generation works
- ✅ All budget action files using `sheetForMonth()` - **NO CHANGES NEEDED**

#### Implementation Details
- ✅ **VERIFIED**: `sheetForMonth()` already generates unique names
  - Calendar months: "budget202401", "budget202412" 
  - Pay periods: "budget202413", "budget202414" (automatically unique)
- ✅ **VERIFIED**: Pay period sheet names won't conflict with calendar months
- ✅ **VERIFIED**: Existing `/^budget\d+/` pattern handles pay period sheets
- ✅ **VERIFIED**: All 60+ references work unchanged with pay period months

### Phase 3: Database Schema Updates
**Priority**: Low (No Schema Changes Needed)
**Status**: 100% Complete

#### Files to Modify
- ✅ `packages/loot-core/src/server/db/types/index.ts` - **NO CHANGES NEEDED**
- ✅ Database migration scripts - **NO MIGRATION NEEDED**

#### Implementation Details
- ✅ **VERIFIED**: Integer fields already handle 202413+ values
- ✅ **VERIFIED**: Existing data remains valid and compatible
- ✅ **VERIFIED**: All existing month-based queries work with pay period integers
- ✅ **VERIFIED**: Pay period IDs (202413-category123) are automatically unique
- ✅ **VERIFIED**: Calendar month data continues working unchanged

### Phase 4: Pay Period Preferences and Database Integration
**Priority**: Critical
**Status**: 100% Complete ✅

#### Files to Modify
- ✅ `packages/loot-core/src/types/prefs.ts` - Added synced preferences
- ✅ `packages/loot-core/src/server/db/types/index.ts` - Added `DbPayPeriodConfig`
- ✅ `packages/loot-core/migrations/1757000000000_add_pay_period_config.sql` - Migration added
- ✅ `packages/desktop-client/src/hooks/useFeatureFlag.ts` - Feature flag added
- ✅ `packages/desktop-client/src/components/settings/Experimental.tsx` - Toggle added
- ✅ `packages/desktop-client/src/components/settings/PayPeriodSettings.tsx` - Settings component created

#### Implementation Details
- ✅ **COMPLETE**: Added synced preferences (`payPeriodFrequency`, `payPeriodStartDate`, `showPayPeriods`)
- ✅ **COMPLETE**: Added `DbPayPeriodConfig` database type
- ✅ **COMPLETE**: Added database migration for `pay_period_config` with defaults
- ✅ **COMPLETE**: Added `payPeriodsEnabled` feature flag and Experimental toggle
- ✅ **COMPLETE**: Implemented Pay Period Settings UI (frequency, start date only)
- ✅ **COMPLETE**: Integrated settings into Settings page behind feature flag
- ✅ **COMPLETE**: Removed redundant "Enable Pay Periods" button from Pay Period settings (simplified to feature flag + view toggle)
- ✅ **COMPLETE**: Removed "Show pay periods in budget view" from Settings (moved to budget page toggle)

### Phase 4.1: Database Migration Details
**Priority**: Critical
**Status**: 100% Complete ✅

#### Database Schema Changes
- ✅ **COMPLETE**: Created `pay_period_config` table with columns:
  - `id` (TEXT PRIMARY KEY) - Configuration identifier
  - `enabled` (INTEGER DEFAULT 0) - Whether pay periods are enabled
  - `pay_frequency` (TEXT DEFAULT 'monthly') - Frequency type
  - `start_date` (TEXT) - ISO date string for pay period start
  - `pay_day_of_week` (INTEGER) - Day of week for weekly/biweekly (0-6)
  - `pay_day_of_month` (INTEGER) - Day of month for monthly (1-31)

#### Default Configuration
- ✅ **COMPLETE**: Default configuration record inserted:
  - ID: 'default'
  - Enabled: 0 (disabled by default)
  - Frequency: 'monthly'
  - Start Date: '2025-01-01'

#### Migration Strategy
- ✅ **COMPLETE**: Migration file added under `packages/loot-core/migrations/`
- ✅ **COMPLETE**: Migration runs automatically via existing migration system
- ✅ **COMPLETE**: Migration is idempotent and safe to re-run
- ✅ **COMPLETE**: Validated against existing database initialization flow

### Phase 5: UI Component Updates
**Priority**: High
**Status**: 100% Complete ✅

#### Files to Modify
- ✅ `packages/desktop-client/src/components/budget/MonthPicker.tsx` - Pay period label rendering
- ✅ `packages/desktop-client/src/components/budget/index.tsx` - View toggle integration and pay period start handling
- ✅ `packages/desktop-client/src/components/budget/BudgetPageHeader.tsx` - View toggle control (checkbox)
- ✅ `packages/desktop-client/src/components/budget/MonthsContext.tsx` - Verified month range uses shared utilities
- ✅ `packages/desktop-client/src/components/budget/DynamicBudgetTable.tsx` - Range logic refinements
- ⚠️ `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx` - Mobile support (file not present; to be planned)

#### Implementation Details
- ✅ **COMPLETE**: Added view toggle control in budget header (checkbox) to show/hide pay periods
- ✅ **COMPLETE**: Month picker displays pay period ranges (e.g., "Dec 31 - Jan 14") with "P{n}" fallback for compact layout
- ✅ **COMPLETE**: Navigation respects pay period sequences when pay period view is active
- ✅ **COMPLETE**: Refined budget month range calculations for pay period mode (simplified to feature flag + view toggle)
- ⚠️ **PENDING**: Add mobile budget page view toggle support
- ✅ **COMPLETE**: Validated month context propagation across all budget components in pay period mode
- ✅ **COMPLETE**: Fixed year mismatch error when navigating pay periods (removed yearStart constraint)
- ✅ **COMPLETE**: Simplified control flow to two-layer system (feature flag + view toggle)

### Phase 5.1: Architectural Decision - YearStart Constraint Removal
**Priority**: High
**Status**: 100% Complete ✅

#### Approach 2: Remove YearStart Constraint
**Rationale**: The current yearStart constraint causes year mismatch errors when users navigate between years. Removing this constraint would make pay periods work for any year automatically, improving user experience and reducing complexity.

#### Files to Modify
- ✅ `packages/loot-core/src/shared/pay-periods.ts` - **COMPLETE** - Removed yearStart validation logic
- ✅ `packages/loot-core/src/types/prefs.ts` - **COMPLETE** - Removed payPeriodYearStart preference
- ⚠️ `packages/loot-core/migrations/` - Migration to remove yearStart column (optional cleanup)
- ✅ `packages/desktop-client/src/components/settings/PayPeriodSettings.tsx` - **COMPLETE** - Removed year start input
- ✅ `packages/desktop-client/src/components/budget/index.tsx` - **COMPLETE** - Simplified derivedStartMonth logic

#### Implementation Details
- ✅ **COMPLETE**: Removed yearStart validation from getPeriodIndex function
- ✅ **COMPLETE**: Always use monthId year for pay period calculations
- ✅ **COMPLETE**: Removed payPeriodYearStart from synced preferences
- ⚠️ **PENDING**: Create migration to remove year_start column from pay_period_config (optional cleanup)
- ✅ **COMPLETE**: Updated Pay Period Settings UI to remove year start input
- ✅ **COMPLETE**: Simplified derivedStartMonth logic to use current year directly
- ✅ **COMPLETE**: Updated all pay period functions to work with any year

### Phase 5.2: Control Flow Simplification
**Priority**: High
**Status**: 100% Complete ✅

#### Simplified Two-Layer System
**Rationale**: The original three-layer system (feature flag + user enable + view toggle) was overly complex. Simplified to a cleaner two-layer approach that maintains functionality while reducing user confusion.

#### Files to Modify
- ✅ `packages/desktop-client/src/components/budget/BudgetPageHeader.tsx` - **COMPLETE** - Removed payPeriodEnabled dependency
- ✅ `packages/desktop-client/src/components/budget/index.tsx` - **COMPLETE** - Simplified derivedStartMonth logic
- ✅ `packages/desktop-client/src/components/settings/PayPeriodSettings.tsx` - **COMPLETE** - Removed enable checkbox
- ✅ `packages/loot-core/src/types/prefs.ts` - **COMPLETE** - Removed payPeriodEnabled preference

#### Implementation Details
- ✅ **COMPLETE**: Removed intermediate `payPeriodEnabled` user preference
- ✅ **COMPLETE**: Simplified to feature flag (`payPeriodsEnabled`) + view toggle (`showPayPeriods`)
- ✅ **COMPLETE**: View toggle now persists user preference directly
- ✅ **COMPLETE**: Pay period configuration uses feature flag + view toggle combination
- ✅ **COMPLETE**: Budget page toggle works directly without intermediate enable step

#### Benefits
- ✅ **SIMPLIFIED UX**: One less step in the user workflow
- ✅ **CLEARER LOGIC**: Direct relationship between feature flag and view toggle
- ✅ **PERSISTENT STATE**: View toggle saves user's preference automatically
- ✅ **DIRECT CONTROL**: Users can toggle pay periods directly on budget page
- ✅ **REDUCED COMPLEXITY**: Fewer variables and conditions to maintain

#### Benefits (YearStart Removal)
- ✅ **USER EXPERIENCE**: Users can view pay periods for any year they're currently viewing
- ✅ **SIMPLICITY**: Less configuration complexity for users
- ✅ **FLEXIBILITY**: Works with existing data and navigation patterns
- ✅ **MINIMAL CODE CHANGES**: Pay period logic already handles year extraction from monthId
- ✅ **NO YEAR MISMATCH ERRORS**: Eliminates the root cause of navigation errors

#### Considerations
- ✅ **PLAN YEAR CONCEPT**: Removed "plan year" concept for better user experience
- ✅ **CONSISTENCY**: Pay period generation is consistent across years
- ⚠️ **MIGRATION**: Existing users with yearStart configuration need migration path (optional cleanup)

### Phase 6: Advanced Features (Optional)
**Priority**: Low
**Status**: 0% Complete

#### Files to Modify
- ⚠️ `packages/loot-core/src/server/migrations/` - Migration utilities
- ⚠️ `packages/loot-core/src/shared/pay-period-templates.ts` - Common templates
- ⚠️ Report components - Pay period analytics

#### Implementation Details
- ⚠️ **PENDING**: Create migration tool for existing users to adopt pay periods
- ⚠️ **PENDING**: Add common pay period templates (biweekly Friday, weekly Monday, etc.)
- ⚠️ **PENDING**: Implement pay period specific analytics and reporting
- ⚠️ **PENDING**: Add pay period vs calendar month comparison features

### Phase 7: Integration and Testing
**Priority**: Medium
**Status**: 0% Complete

#### Files to Modify
- ⚠️ All budget-related components and utilities
- ⚠️ Test files and integration tests
- ⚠️ Documentation files

#### Implementation Details
- ⚠️ **PENDING**: Comprehensive integration testing across all components
- ⚠️ **PENDING**: End-to-end testing of pay period workflows
- ⚠️ **PENDING**: Performance testing with large pay period ranges
- ⚠️ **PENDING**: User acceptance testing for pay period UI
- ⚠️ **PENDING**: Backward compatibility testing with existing data
- ⚠️ **PENDING**: Create user documentation for pay period setup
- ⚠️ **PENDING**: Performance optimization for large pay period datasets

## Success Metrics
- All existing calendar month functionality continues to work unchanged
- Pay period months (13-99) are properly validated and stored
- Month picker correctly displays "Dec 31 - Jan 14" format (with "P1" fallback)
- Database queries work with both calendar and pay period months
- Spreadsheet system generates unique, meaningful sheet names
- User can seamlessly switch between calendar and pay period modes via simplified two-layer system
- Feature flag system properly controls pay period availability
- View toggle persists user preference and works directly without intermediate enable step
- Mobile budget page supports pay period view toggle
- No data loss during migration from calendar to pay period mode
- Performance remains acceptable with large pay period ranges

## Implementation Notes
- This implementation must maintain full backward compatibility
- Pay period mode uses simplified two-layer system: feature flag + view toggle
- Feature flag controls availability via experimental settings
- View toggle uses simple synced preference (`showPayPeriods`) and persists user choice
- All month-related functions must be updated to handle both formats
- UI components need graceful degradation when pay periods are disabled
- Testing must cover both calendar and pay period scenarios extensively
- Advanced features (migration tools, templates, analytics) are optional
- Mobile support is essential for complete user experience
