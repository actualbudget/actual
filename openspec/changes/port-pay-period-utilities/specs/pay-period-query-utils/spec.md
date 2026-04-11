## ADDED Requirements

### Requirement: Current period detection

The system SHALL provide an `isCurrentPeriod(month, config?)` function that returns `true` when the given month ID represents the current period regardless of mode. When pay periods are active (valid pay period ID and config provided), it SHALL compare against the current pay period. When pay periods are not active, it SHALL compare against the current calendar month (`YYYY-MM` format).

#### Scenario: Current calendar month without config

- **WHEN** `isCurrentPeriod('2026-04')` is called with no config and the current date is in April 2026
- **THEN** the function returns `true`

#### Scenario: Non-current calendar month without config

- **WHEN** `isCurrentPeriod('2026-03')` is called with no config and the current date is in April 2026
- **THEN** the function returns `false`

#### Scenario: Current pay period with config

- **WHEN** `isCurrentPeriod('2026-14', config)` is called and `getPayPeriodFromDate(new Date(), config)` returns `'2026-14'`
- **THEN** the function returns `true`

#### Scenario: Non-current pay period with config

- **WHEN** `isCurrentPeriod('2026-15', config)` is called and `getPayPeriodFromDate(new Date(), config)` returns `'2026-14'`
- **THEN** the function returns `false`

#### Scenario: Calendar ID with config falls back to calendar comparison

- **WHEN** `isCurrentPeriod('2026-04', config)` is called (calendar format, not a pay period ID)
- **THEN** the function SHALL fall back to calendar month comparison regardless of config

### Requirement: Date filter resolution

The system SHALL provide a `resolveMonthToDateFilter(month, config?)` function that converts a month or pay period ID into a query-compatible date filter object. For pay period IDs with active config, it SHALL return `{ date: { $gte: startDate, $lte: endDate } }`. For calendar months (or when config is absent), it SHALL return `{ date: { $transform: '$month', $eq: month } }`.

#### Scenario: Calendar month returns transform filter

- **WHEN** `resolveMonthToDateFilter('2026-04')` is called with no config
- **THEN** the function returns `{ date: { $transform: '$month', $eq: '2026-04' } }`

#### Scenario: Calendar month with config returns transform filter

- **WHEN** `resolveMonthToDateFilter('2026-04', config)` is called (calendar format)
- **THEN** the function returns `{ date: { $transform: '$month', $eq: '2026-04' } }`

#### Scenario: Pay period with config returns date range filter

- **WHEN** `resolveMonthToDateFilter('2026-14', config)` is called and the period maps to Jan 19 - Feb 1
- **THEN** the function returns `{ date: { $gte: '2026-01-19', $lte: '2026-02-01' } }`

#### Scenario: Pay period without config falls back

- **WHEN** `resolveMonthToDateFilter('2026-14')` is called with no config
- **THEN** the function returns `{ date: { $transform: '$month', $eq: '2026-14' } }`

### Requirement: Mode-aware start month resolution

The system SHALL provide a `resolveStartMonth(stored, config, fallback)` function in `months.ts` that returns the stored value when its format matches the current mode, and the fallback otherwise. A stored value is considered matching when: it is a pay period ID and config is enabled, or it is a calendar month ID and config is not enabled.

#### Scenario: Calendar stored, no pay periods

- **WHEN** `resolveStartMonth('2026-04', undefined, '2026-01')` is called
- **THEN** the function returns `'2026-04'` (stored matches calendar mode)

#### Scenario: Pay period stored, pay periods active

- **WHEN** `resolveStartMonth('2026-14', enabledConfig, '2026-01')` is called
- **THEN** the function returns `'2026-14'` (stored matches pay period mode)

#### Scenario: Stale pay period stored, pay periods disabled

- **WHEN** `resolveStartMonth('2026-14', undefined, '2026-04')` is called
- **THEN** the function returns `'2026-04'` (fallback — stale period ID doesn't match calendar mode)

#### Scenario: Stale calendar stored, pay periods enabled

- **WHEN** `resolveStartMonth('2026-04', enabledConfig, '2026-14')` is called
- **THEN** the function returns `'2026-14'` (fallback — calendar ID doesn't match pay period mode)
