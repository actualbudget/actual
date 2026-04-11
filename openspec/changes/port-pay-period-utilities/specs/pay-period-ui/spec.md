## MODIFIED Requirements

### Requirement: Budget header current period highlighting

The budget header background color SHALL use `isCurrentPeriod(month, payPeriodConfig)` instead of `monthUtils.isCurrentMonth(month)` to determine whether to apply the current-month theme color. This ensures the correct column is highlighted when pay periods are active. The `payPeriodConfig` SHALL be obtained from the existing `usePayPeriodConfig()` context hook.

#### Scenario: Calendar mode highlighting unchanged

- **WHEN** pay periods are disabled and the user views the budget for the current calendar month
- **THEN** the budget header for that month SHALL display `theme.budgetHeaderCurrentMonth` background color

#### Scenario: Pay period mode highlights current period

- **WHEN** pay periods are enabled and the user views the budget for the current pay period
- **THEN** the budget header for that period SHALL display `theme.budgetHeaderCurrentMonth` background color

#### Scenario: Non-current period not highlighted

- **WHEN** the user views a budget column that is not the current period (in either mode)
- **THEN** the budget header SHALL display `theme.budgetHeaderOtherMonth` background color

### Requirement: Short label format for pay period display

The `getPayPeriodLabel()` function SHALL support a `'short'` format that returns a compact date range string (e.g., `Jan 5 - Jan 18`) without period numbers. This format is suitable for mobile budget headings where space is constrained.

#### Scenario: Short format returns date range only

- **WHEN** `getPayPeriodLabel(month, config, 'short')` is called for a period spanning Jan 5 to Jan 18
- **THEN** the function returns `'Jan 5 - Jan 18'` (or equivalent locale-formatted dates)

#### Scenario: Short format with cross-month period

- **WHEN** `getPayPeriodLabel(month, config, 'short')` is called for a period spanning Jan 19 to Feb 1
- **THEN** the function returns `'Jan 19 - Feb 1'`
