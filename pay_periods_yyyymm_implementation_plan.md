# Pay Periods Implementation Plan
## YYYYMM-Based Pay Period Support for Actual Budget

### Overview

This document outlines the implementation plan for adding pay period support to Actual Budget using the "extended months" approach. Instead of changing the core month-based architecture, we'll extend it to support pay periods by using month identifiers 13-99 (MM 13-99) for pay periods while keeping MM 01-12 for calendar months.

### Core Concept

- **Calendar Months**: MM 01-12 (existing behavior unchanged)
- **Pay Periods**: MM 13-99 (new functionality)
- **Month ID Format**: `YYYYMM` where MM can be 01-99
- **Backward Compatibility**: All existing monthly budgets continue to work exactly as before

### Architecture Benefits

1. **Minimal Disruption**: No database schema changes required
2. **Backward Compatible**: Existing monthly budgets unaffected
3. **Incremental Implementation**: Can be rolled out gradually
4. **Performance**: Leverages existing month-based optimizations
5. **Flexibility**: Supports weekly, biweekly, semimonthly, and monthly pay schedules

---

## Phase 1: Core Infrastructure (Foundation)

### 1.1 Extend Month Utilities (`packages/loot-core/src/shared/months.ts`)

**Priority**: Critical
**Estimated Time**: 2-3 days

#### New Functions to Add:
```typescript
// Pay period configuration types
export type PayPeriodConfig = {
  enabled: boolean;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  startDate: string; // ISO date string
  payDayOfWeek?: number; // 0-6 for weekly/biweekly
  payDayOfMonth?: number; // 1-31 for monthly
  yearStart: number;
};

// Core pay period functions
export function isPayPeriod(monthId: string): boolean;
export function isCalendarMonth(monthId: string): boolean;
export function getPayPeriodConfig(): PayPeriodConfig | null;
export function setPayPeriodConfig(config: PayPeriodConfig): void;

// Date range functions for pay periods
export function getPayPeriodStartDate(monthId: string, config: PayPeriodConfig): Date;
export function getPayPeriodEndDate(monthId: string, config: PayPeriodConfig): Date;
export function getPayPeriodLabel(monthId: string, config: PayPeriodConfig): string;

// Unified functions that work for both calendar months and pay periods
export function getMonthStartDate(monthId: string, config?: PayPeriodConfig): Date;
export function getMonthEndDate(monthId: string, config?: PayPeriodConfig): Date;
export function getMonthLabel(monthId: string, config?: PayPeriodConfig): string;
export function resolveMonthRange(monthId: string, config?: PayPeriodConfig): {
  startDate: Date;
  endDate: Date;
  label: string;
};

// Pay period generation
export function generatePayPeriods(year: number, config: PayPeriodConfig): Array<{
  monthId: string;
  startDate: string;
  endDate: string;
  label: string;
}>;
```

#### Implementation Details:
- Port the POC code from `payPeriodDates.js` to TypeScript
- Integrate with existing `monthUtils` functions
- Add proper error handling and validation
- Maintain UTC date handling for consistency

### 1.2 Add Pay Period Preferences

**Priority**: Critical
**Estimated Time**: 1-2 days

#### Update `packages/loot-core/src/types/prefs.ts`:
```typescript
export type SyncedPrefs = Partial<
  Record<
    // ... existing prefs
    | 'payPeriodEnabled'
    | 'payPeriodFrequency'
    | 'payPeriodStartDate'
    | 'payPeriodYearStart'
    | string
  >
>;
```

#### Add to `packages/loot-core/src/server/db/types/index.ts`:
```typescript
export type DbPayPeriodConfig = {
  id: string;
  enabled: boolean;
  pay_frequency: string;
  start_date: string;
  pay_day_of_week?: number;
  pay_day_of_month?: number;
  year_start: number;
};
```

### 1.3 Database Migration

**Priority**: Critical
**Estimated Time**: 1 day

#### Create migration file:
```sql
-- Add pay period configuration table
CREATE TABLE pay_period_config (
  id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  pay_frequency TEXT DEFAULT 'monthly',
  start_date TEXT,
  pay_day_of_week INTEGER,
  pay_day_of_month INTEGER,
  year_start INTEGER
);

-- Insert default configuration
INSERT INTO pay_period_config (id, enabled, pay_frequency, start_date, year_start)
VALUES ('default', 0, 'monthly', '2024-01-01', 2024);
```

---

## Phase 2: Backend Integration

### 2.1 Update Budget Creation Logic

**Priority**: High
**Estimated Time**: 2-3 days

#### Modify `packages/loot-core/src/server/budget/base.ts`:

```typescript
// Update createAllBudgets to include pay periods
export async function createAllBudgets() {
  const earliestTransaction = await db.first<db.DbTransaction>(
    'SELECT * FROM transactions WHERE isChild=0 AND date IS NOT NULL ORDER BY date ASC LIMIT 1',
  );
  const earliestDate = earliestTransaction && db.fromDateRepr(earliestTransaction.date);
  const currentMonth = monthUtils.currentMonth();

  // Get calendar month range
  const { start, end, range } = getBudgetRange(
    earliestDate || currentMonth,
    currentMonth,
  );

  // Get pay period range if enabled
  const payPeriodConfig = await getPayPeriodConfig();
  let payPeriodRange: string[] = [];
  
  if (payPeriodConfig?.enabled) {
    const payPeriods = monthUtils.generatePayPeriods(
      payPeriodConfig.yearStart,
      payPeriodConfig
    );
    payPeriodRange = payPeriods.map(p => p.monthId);
  }

  // Combine both ranges
  const allMonths = [...range, ...payPeriodRange];
  const newMonths = allMonths.filter(m => !meta.createdMonths.has(m));

  if (newMonths.length > 0) {
    await createBudget(allMonths);
  }

  return { start, end, payPeriodRange };
}
```

### 2.2 Update API Endpoints

**Priority**: High
**Estimated Time**: 2 days

#### Modify `packages/loot-core/src/server/api.ts`:

```typescript
// Add pay period configuration endpoints
handlers['api/pay-period-config'] = async function() {
  return await getPayPeriodConfig();
};

handlers['api/set-pay-period-config'] = withMutation(async function(config) {
  await setPayPeriodConfig(config);
  // Regenerate budgets if config changed
  await budget.createAllBudgets();
});

// Update month validation to include pay periods
async function validateMonth(month) {
  if (!month.match(/^\d{4}-\d{2}$/)) {
    throw APIError('Invalid month format, use YYYY-MM: ' + month);
  }

  if (!IMPORT_MODE) {
    const { start, end, payPeriodRange } = await handlers['get-budget-bounds']();
    const allValidMonths = [...monthUtils.range(start, end), ...payPeriodRange];
    
    if (!allValidMonths.includes(month)) {
      throw APIError('No budget exists for month: ' + month);
    }
  }
}
```

### 2.3 Update Budget Actions

**Priority**: High
**Estimated Time**: 1-2 days

#### Modify `packages/loot-core/src/server/budget/actions.ts`:

```typescript
// Update getAllMonths to include pay periods
function getAllMonths(startMonth: string): string[] {
  const currentMonth = monthUtils.currentMonth();
  const calendarRange = monthUtils.rangeInclusive(startMonth, currentMonth);
  
  // Add pay periods if enabled
  const payPeriodConfig = getPayPeriodConfig();
  let payPeriodMonths: string[] = [];
  
  if (payPeriodConfig?.enabled) {
    const payPeriods = monthUtils.generatePayPeriods(
      payPeriodConfig.yearStart,
      payPeriodConfig
    );
    payPeriodMonths = payPeriods.map(p => p.monthId);
  }
  
  return [...calendarRange, ...payPeriodMonths];
}
```

---

## Phase 3: Frontend Integration

### 3.1 Pay Period Settings UI

**Priority**: High
**Estimated Time**: 3-4 days

#### Add Pay Period Feature Flag

First, update the feature flag types and defaults:

**Update `packages/loot-core/src/types/prefs.ts`:**
```typescript
export type FeatureFlag =
  | 'goalTemplatesEnabled'
  | 'goalTemplatesUIEnabled'
  | 'actionTemplating'
  | 'currency'
  | 'payPeriodsEnabled'; // Add this new feature flag
```

**Update `packages/desktop-client/src/hooks/useFeatureFlag.ts`:**
```typescript
const DEFAULT_FEATURE_FLAG_STATE: Record<FeatureFlag, boolean> = {
  goalTemplatesEnabled: false,
  goalTemplatesUIEnabled: false,
  actionTemplating: false,
  currency: false,
  payPeriodsEnabled: false, // Add this new feature flag
};
```

#### Add Pay Period Settings to Experimental Features

**Update `packages/desktop-client/src/components/settings/Experimental.tsx`:**
```typescript
export function ExperimentalFeatures() {
  const [expanded, setExpanded] = useState(false);

  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');
  const showGoalTemplatesUI =
    goalTemplatesUIEnabled ||
    (goalTemplatesEnabled &&
      localStorage.getItem('devEnableGoalTemplatesUI') === 'true');

  return (
    <Setting
      primaryAction={
        expanded ? (
          <View style={{ gap: '1em' }}>
            <FeatureToggle flag="goalTemplatesEnabled">
              <Trans>Goal templates</Trans>
            </FeatureToggle>
            {showGoalTemplatesUI && (
              <View style={{ paddingLeft: 22 }}>
                <FeatureToggle flag="goalTemplatesUIEnabled">
                  <Trans>Subfeature: Budget automations UI</Trans>
                </FeatureToggle>
              </View>
            )}
            <FeatureToggle
              flag="actionTemplating"
              feedbackLink="https://github.com/actualbudget/actual/issues/3606"
            >
              <Trans>Rule action templating</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="currency"
              feedbackLink="https://github.com/actualbudget/actual/issues/5191"
            >
              <Trans>Currency support</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="payPeriodsEnabled"
              feedbackLink="https://github.com/actualbudget/actual/issues/XXXX"
            >
              <Trans>Pay periods support</Trans>
            </FeatureToggle>
          </View>
        ) : (
          <Link
            variant="text"
            onClick={() => setExpanded(true)}
            data-testid="experimental-settings"
            style={{
              flexShrink: 0,
              alignSelf: 'flex-start',
              color: theme.pageTextPositive,
            }}
          >
            <Trans>I understand the risks, show experimental features</Trans>
          </Link>
        )
      }
    >
      <Text>
        <Trans>
          <strong>Experimental features.</strong> These features are not fully
          tested and may not work as expected. THEY MAY CAUSE IRRECOVERABLE DATA
          LOSS. They may do nothing at all. Only enable them if you know what
          you are doing.
        </Trans>
      </Text>
    </Setting>
  );
}
```

#### Create Pay Period Settings Component

**Create `packages/desktop-client/src/components/settings/PayPeriodSettings.tsx`:**

```typescript
import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { send } from '@desktop-client/loot-core';

type PayPeriodConfig = {
  enabled: boolean;
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  startDate: string;
  payDayOfWeek?: number;
  payDayOfMonth?: number;
  yearStart: number;
};

export function PayPeriodSettings() {
  const { t } = useTranslation();
  const payPeriodsEnabled = useFeatureFlag('payPeriodsEnabled');
  const [config, setConfig] = useState<PayPeriodConfig | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (payPeriodsEnabled) {
      loadConfig();
    }
  }, [payPeriodsEnabled]);

  const loadConfig = async () => {
    try {
      const response = await send('get-pay-period-config');
      setConfig(response);
    } catch (error) {
      console.error('Failed to load pay period config:', error);
    }
  };

  const handleSave = async (newConfig: PayPeriodConfig) => {
    setLoading(true);
    try {
      await send('set-pay-period-config', newConfig);
      setConfig(newConfig);
      // Show success message
    } catch (error) {
      // Show error message
    } finally {
      setLoading(false);
    }
  };

  if (!payPeriodsEnabled) {
    return null;
  }

  return (
    <View style={{ gap: '1em' }}>
      <Text>
        <Trans>Pay Period Settings</Trans>
      </Text>
      
      <View style={{ gap: '0.5em' }}>
        <Text>
          <Trans>Pay Frequency</Trans>
        </Text>
        <Select
          value={config?.payFrequency || 'monthly'}
          onChange={(payFrequency) => setConfig({...config, payFrequency})}
          options={[
            { value: 'weekly', label: t('Weekly') },
            { value: 'biweekly', label: t('Biweekly') },
            { value: 'semimonthly', label: t('Semimonthly') },
            { value: 'monthly', label: t('Monthly') },
          ]}
        />
      </View>
      
      <View style={{ gap: '0.5em' }}>
        <Text>
          <Trans>Start Date</Trans>
        </Text>
        <Input
          type="date"
          value={config?.startDate || ''}
          onChange={(startDate) => setConfig({...config, startDate})}
        />
      </View>
      
      <Button 
        onClick={() => config && handleSave(config)}
        disabled={loading || !config}
      >
        <Trans>Save Settings</Trans>
      </Button>
    </View>
  );
}
```

### 3.2 Update Month Picker Component

**Priority**: High
**Estimated Time**: 4-5 days

#### Add View Toggle to Budget Page

**Update `packages/desktop-client/src/components/budget/index.tsx`:**

Add a view toggle button in the budget header that switches between calendar months and pay periods:

```typescript
// Add to imports
import { SvgViewShow, SvgViewHide } from '@actual-app/components/icons/v2';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';

// Add to BudgetInner component
function BudgetInner(props: BudgetInnerProps) {
  const payPeriodsEnabled = useFeatureFlag('payPeriodsEnabled');
  const [showPayPeriods, setShowPayPeriods] = useState(false);
  
  // ... existing code ...

  return (
    <View>
      {/* Add view toggle in budget header */}
      {payPeriodsEnabled && (
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 8,
          marginBottom: 10 
        }}>
          <Button
            variant="bare"
            onClick={() => setShowPayPeriods(!showPayPeriods)}
            style={{
              padding: 8,
              borderRadius: 4,
              backgroundColor: showPayPeriods ? theme.buttonPrimaryBackground : 'transparent',
              color: showPayPeriods ? theme.buttonPrimaryText : theme.pageText,
            }}
            aria-label={showPayPeriods ? 'Switch to Calendar Months' : 'Switch to Pay Periods'}
          >
            {showPayPeriods ? (
              <SvgViewHide style={{ width: 16, height: 16 }} />
            ) : (
              <SvgViewShow style={{ width: 16, height: 16 }} />
            )}
          </Button>
          <Text style={{ fontSize: 14, fontWeight: 500 }}>
            {showPayPeriods ? 'Pay Periods' : 'Calendar Months'}
          </Text>
        </View>
      )}
      
      {/* Existing budget content */}
      {/* ... */}
    </View>
  );
}
```

#### Modify `packages/desktop-client/src/components/budget/MonthPicker.tsx`:

```typescript
// Add to imports
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';

type MonthPickerProps = {
  startMonth: string;
  numDisplayed: number;
  monthBounds: MonthBounds;
  showPayPeriods?: boolean; // Add this prop
  onSelect: (month: string) => void;
};

export const MonthPicker = ({
  startMonth,
  numDisplayed,
  monthBounds,
  showPayPeriods = false, // Add default value
  style,
  onSelect,
}: MonthPickerProps) => {
  const payPeriodsEnabled = useFeatureFlag('payPeriodsEnabled');
  const payPeriodConfig = usePayPeriodConfig();

  // Generate available months based on current view mode
  const availableMonths = useMemo(() => {
    if (showPayPeriods && payPeriodsEnabled && payPeriodConfig?.enabled) {
      return monthUtils.generatePayPeriods(
        payPeriodConfig.yearStart,
        payPeriodConfig
      ).map(p => p.monthId);
    } else {
      return monthUtils.rangeInclusive(monthBounds.start, monthBounds.end);
    }
  }, [showPayPeriods, payPeriodsEnabled, payPeriodConfig, monthBounds]);

  // Update month formatting to show pay period labels
  const getMonthLabel = (month: string) => {
    if (showPayPeriods && monthUtils.isPayPeriod(month) && payPeriodConfig) {
      return monthUtils.getMonthLabel(month, payPeriodConfig);
    } else {
      return monthUtils.format(month, 'MMM', locale);
    }
  };

  // Update range calculation for pay periods
  const range = useMemo(() => {
    if (showPayPeriods && payPeriodsEnabled && payPeriodConfig?.enabled) {
      return availableMonths;
    } else {
      return monthUtils.rangeInclusive(
        monthUtils.subMonths(
          firstSelectedMonth,
          Math.floor(targetMonthCount / 2 - numDisplayed / 2),
        ),
        monthUtils.addMonths(
          lastSelectedMonth,
          Math.floor(targetMonthCount / 2 - numDisplayed / 2),
        ),
      );
    }
  }, [showPayPeriods, payPeriodsEnabled, payPeriodConfig, availableMonths, /* other deps */]);

  return (
    <View style={style}>
      {/* Existing month picker logic with updated labels */}
      {range.map((month, idx) => {
        const monthName = getMonthLabel(month);
        const selected = /* existing selection logic */;
        const hovered = /* existing hover logic */;
        const current = /* existing current logic */;
        const year = monthUtils.getYear(month);

        // ... existing year header logic ...

        return (
          <View key={month}>
            {/* Year header if needed */}
            {showYearHeader && (
              <Text style={yearHeaderStyle}>{year}</Text>
            )}
            
            {/* Month button */}
            <Button
              variant="bare"
              onClick={() => onSelect(month)}
              style={{
                /* existing button styles */
                backgroundColor: selected ? theme.buttonPrimaryBackground : 'transparent',
                color: selected ? theme.buttonPrimaryText : theme.pageText,
              }}
            >
              <Text style={monthButtonTextStyle}>
                {monthName}
              </Text>
            </Button>
          </View>
        );
      })}
    </View>
  );
};
```

#### Update Budget Components to Pass View Mode

**Update `packages/desktop-client/src/components/budget/DynamicBudgetTable.tsx`:**

```typescript
// Add showPayPeriods prop to component
type DynamicBudgetTableProps = {
  // ... existing props
  showPayPeriods?: boolean;
};

const DynamicBudgetTableInner = ({
  // ... existing props
  showPayPeriods = false,
}: DynamicBudgetTableInnerProps) => {
  // ... existing code ...

  return (
    <View>
      {/* Pass showPayPeriods to MonthPicker */}
      <MonthPicker
        startMonth={startMonth}
        numDisplayed={numMonths}
        monthBounds={monthBounds}
        showPayPeriods={showPayPeriods}
        onSelect={_onMonthSelect}
      />
      
      {/* Rest of component */}
    </View>
  );
};
```

### 3.3 Update Mobile Budget Page

**Priority**: High
**Estimated Time**: 2-3 days

#### Add View Toggle to Mobile Budget Page

**Update `packages/desktop-client/src/components/mobile/budget/BudgetPage.tsx`:**

Add the same view toggle functionality to the mobile budget page:

```typescript
// Add to imports
import { SvgViewShow, SvgViewHide } from '@actual-app/components/icons/v2';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';

// Add to BudgetPage component
export function BudgetPage() {
  const payPeriodsEnabled = useFeatureFlag('payPeriodsEnabled');
  const [showPayPeriods, setShowPayPeriods] = useState(false);
  
  // ... existing code ...

  return (
    <View>
      {/* Add view toggle in mobile budget header */}
      {payPeriodsEnabled && (
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8,
          padding: 10,
          backgroundColor: theme.pageBackground,
          borderBottom: `1px solid ${theme.borderColor}`,
        }}>
          <Button
            variant="bare"
            onClick={() => setShowPayPeriods(!showPayPeriods)}
            style={{
              padding: 8,
              borderRadius: 4,
              backgroundColor: showPayPeriods ? theme.buttonPrimaryBackground : 'transparent',
              color: showPayPeriods ? theme.buttonPrimaryText : theme.pageText,
            }}
            aria-label={showPayPeriods ? 'Switch to Calendar Months' : 'Switch to Pay Periods'}
          >
            {showPayPeriods ? (
              <SvgViewHide style={{ width: 16, height: 16 }} />
            ) : (
              <SvgViewShow style={{ width: 16, height: 16 }} />
            )}
          </Button>
          <Text style={{ fontSize: 14, fontWeight: 500 }}>
            {showPayPeriods ? 'Pay Periods' : 'Calendar Months'}
          </Text>
        </View>
      )}
      
      {/* Existing mobile budget content */}
      {/* ... */}
    </View>
  );
}
```

#### Update Mobile Month Selector

**Update the MonthSelector component in the same file:**

```typescript
function MonthSelector({
  month,
  monthBounds,
  onOpenMonthMenu,
  onPrevMonth,
  onNextMonth,
  showPayPeriods = false, // Add this prop
}) {
  const locale = useLocale();
  const { t } = useTranslation();
  const payPeriodConfig = usePayPeriodConfig();
  
  // Update month formatting for pay periods
  const getMonthLabel = (month: string) => {
    if (showPayPeriods && monthUtils.isPayPeriod(month) && payPeriodConfig) {
      return monthUtils.getMonthLabel(month, payPeriodConfig);
    } else {
      return monthUtils.format(month, 'MMMM 'yy', locale);
    }
  };

  // ... existing logic ...

  return (
    <View style={{ /* existing styles */ }}>
      {/* Previous month button */}
      <Button
        aria-label={t('Previous month')}
        variant="bare"
        isDisabled={!prevEnabled}
        onPress={onPrevMonth}
        style={{ /* existing styles */ }}
      >
        <SvgArrowThinLeft width="15" height="15" />
      </Button>
      
      {/* Month display */}
      <Button
        variant="bare"
        style={{ /* existing styles */ }}
        onPress={() => {
          onOpenMonthMenu?.(month);
        }}
        data-month={month}
      >
        <Text style={styles.underlinedText}>
          {getMonthLabel(month)}
        </Text>
      </Button>
      
      {/* Next month button */}
      <Button
        aria-label={t('Next month')}
        variant="bare"
        isDisabled={!nextEnabled}
        onPress={onNextMonth}
        style={{ /* existing styles */ }}
      >
        <SvgArrowThinRight width="15" height="15" />
      </Button>
    </View>
  );
}
```

### 3.4 Update Budget Components

**Priority**: Medium
**Estimated Time**: 3-4 days

#### Modify budget components to handle pay periods:

- **`EnvelopeBudgetComponents.tsx`**: Update month headers and labels
- **`TrackingBudgetComponents.tsx`**: Update month headers and labels
- **`BudgetCell.tsx`**: Ensure proper month ID handling
- **`DynamicBudgetTable.tsx`**: Update month navigation logic

### 3.5 Update Reports

**Priority**: Medium
**Estimated Time**: 2-3 days

#### Modify report components to support pay periods:

- **`getLiveRange.ts`**: Add pay period range calculations
- **`spending-spreadsheet.ts`**: Update date range handling
- **`summary-spreadsheet.ts`**: Update date range handling

---

## Phase 4: Advanced Features

### 4.1 Pay Period Migration Tool

**Priority**: Medium
**Estimated Time**: 2-3 days

#### Create migration utility for existing users:

```typescript
// packages/loot-core/src/server/migrations/add-pay-period-support.ts
export async function migrateToPayPeriods() {
  // Analyze existing budget patterns
  // Suggest appropriate pay frequency based on budget activity
  // Create pay period budgets based on existing monthly budgets
  // Preserve user data and preferences
}
```

### 4.2 Pay Period Templates

**Priority**: Low
**Estimated Time**: 2-3 days

#### Add common pay period templates:

```typescript
export const PAY_PERIOD_TEMPLATES = {
  'biweekly-friday': {
    payFrequency: 'biweekly',
    startDate: '2024-01-05', // First Friday
    payDayOfWeek: 5,
  },
  'weekly-monday': {
    payFrequency: 'weekly',
    startDate: '2024-01-01', // First Monday
    payDayOfWeek: 1,
  },
  'semimonthly-1-15': {
    payFrequency: 'semimonthly',
    startDate: '2024-01-01',
    payDayOfMonth: 1,
  },
};
```

### 4.3 Pay Period Analytics

**Priority**: Low
**Estimated Time**: 3-4 days

#### Add pay period specific analytics:

- Pay period spending patterns
- Pay period budget adherence
- Pay period carryover analysis
- Pay period vs calendar month comparisons

---

## Phase 5: Testing & Polish

### 5.1 Comprehensive Testing

**Priority**: Critical
**Estimated Time**: 3-4 days

#### Test Coverage:
- Unit tests for all new month utilities
- Integration tests for budget creation with pay periods
- UI tests for month picker with pay periods
- End-to-end tests for complete pay period workflow
- Performance tests with large numbers of pay periods
- Migration tests for existing users

#### Test Scenarios:
- Switching between calendar months and pay periods
- Different pay frequencies (weekly, biweekly, semimonthly)
- Pay periods spanning month boundaries
- Pay periods spanning year boundaries
- Edge cases (leap years, DST transitions)
- Large datasets with many pay periods

### 5.2 Documentation

**Priority**: Medium
**Estimated Time**: 2-3 days

#### Documentation Updates:
- User guide for pay period setup
- Developer documentation for new APIs
- Migration guide for existing users
- Troubleshooting guide for common issues

### 5.3 Performance Optimization

**Priority**: Medium
**Estimated Time**: 2-3 days

#### Optimization Areas:
- Lazy loading of pay period data
- Caching of pay period calculations
- Optimized database queries for pay periods
- UI performance with many pay periods

---

## Implementation Timeline

### Week 1-2: Phase 1 (Core Infrastructure)
- [ ] Extend month utilities
- [ ] Add pay period preferences
- [ ] Create database migration
- [ ] Basic testing

### Week 3-4: Phase 2 (Backend Integration)
- [ ] Update budget creation logic
- [ ] Update API endpoints
- [ ] Update budget actions
- [ ] Backend testing

### Week 5-7: Phase 3 (Frontend Integration)
- [ ] Pay period settings UI
- [ ] Update month picker
- [ ] Update budget components
- [ ] Update reports
- [ ] Frontend testing

### Week 8-9: Phase 4 (Advanced Features)
- [ ] Migration tool
- [ ] Pay period templates
- [ ] Pay period analytics
- [ ] Feature testing

### Week 10: Phase 5 (Testing & Polish)
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Performance optimization
- [ ] Final polish

---

## Risk Mitigation

### Technical Risks
1. **Performance Impact**: Mitigate with lazy loading and caching
2. **Data Migration**: Thorough testing with backup/restore procedures
3. **UI Complexity**: Gradual rollout with feature flags
4. **Backward Compatibility**: Extensive testing with existing data

### User Experience Risks
1. **Confusion**: Clear UI indicators and help text
2. **Data Loss**: Comprehensive backup before migration
3. **Learning Curve**: Intuitive defaults and guided setup

### Business Risks
1. **Feature Adoption**: Gradual rollout with user feedback
2. **Support Load**: Comprehensive documentation and training
3. **Performance Issues**: Load testing and monitoring

---

## Success Metrics

### Technical Metrics
- All existing tests pass
- New test coverage > 90%
- Performance impact < 5%
- Zero data loss during migration

### User Experience Metrics
- Pay period setup completion rate > 80%
- User satisfaction score > 4.5/5
- Support ticket increase < 10%
- Feature adoption rate > 30% within 3 months

### Business Metrics
- Increased user engagement
- Reduced churn rate
- Positive user feedback
- Successful migration of existing users

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding pay period support to Actual Budget while maintaining backward compatibility and minimizing risk. The phased approach allows for iterative development, testing, and user feedback, ensuring a successful rollout of this valuable feature.

The "extended months" approach leverages the existing architecture effectively, providing a solid foundation for future enhancements while delivering immediate value to users with non-monthly pay schedules.

---

## Key Updates to Implementation Plan

### Experimental Feature Integration
- **Feature Flag**: Added `payPeriodsEnabled` to the experimental features system
- **Settings UI**: Integrated pay period settings into the existing experimental features panel
- **Progressive Rollout**: Users must explicitly enable the feature, ensuring controlled adoption

### View Toggle Implementation
- **Desktop Budget Page**: Added view toggle button using `SvgViewShow`/`SvgViewHide` icons
- **Mobile Budget Page**: Added matching view toggle for mobile experience
- **Month Picker Integration**: Updated MonthPicker to support both calendar months and pay periods
- **Consistent UX**: Same toggle behavior across desktop and mobile platforms

### Icon Strategy
- **View Toggle**: Uses `SvgViewShow` (eye icon) and `SvgViewHide` (eye with slash) for intuitive switching
- **Visual Feedback**: Toggle button changes appearance when pay periods are active
- **Accessibility**: Proper ARIA labels for screen readers

### User Experience Flow
1. **Enable Feature**: User enables "Pay periods support" in experimental features
2. **Configure Settings**: User sets up pay frequency and start date
3. **Toggle View**: User clicks view toggle to switch between calendar months and pay periods
4. **Seamless Navigation**: Month picker adapts to show appropriate periods based on current view

This approach ensures a smooth, intuitive user experience while maintaining the experimental nature of the feature during initial rollout.
