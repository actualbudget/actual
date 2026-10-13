import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { isValidForecastAnchorDate } from '@actual-app/core/shared/forecast-assumptions';
import { currentDay } from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import type {
  ForecastAssumptions,
  ForecastSource,
} from '@actual-app/core/types/models/forecast';

import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { usePayeesById } from '#hooks/usePayees';
import { useSchedules } from '#hooks/useSchedules';

export function ForecastAssumptionsControls({
  assumptions,
  source,
  onApply,
}: {
  assumptions?: ForecastAssumptions;
  source: ForecastSource;
  onApply: (assumptions: ForecastAssumptions | undefined) => void;
}) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(assumptions != null);
  const [anchorDate, setAnchorDate] = useState(
    assumptions?.anchorDate ?? currentDay(),
  );
  const [inflation, setInflation] = useState(
    String((assumptions?.inflationRate ?? 0) * 100),
  );
  const [salaryGrowth, setSalaryGrowth] = useState(
    String((assumptions?.salaryGrowthRate ?? 0) * 100),
  );
  const [selectedIds, setSelectedIds] = useState(
    assumptions?.incomeScheduleIds ?? [],
  );
  const [error, setError] = useState('');
  const {
    schedules,
    isLoading,
    error: scheduleError,
  } = useSchedules({ query: scheduleQuery });
  const { data: payees } = usePayeesById();
  const incomeSchedules = schedules.filter(
    schedule =>
      typeof schedule._date !== 'string' &&
      getScheduledAmount(schedule._amount) > 0 &&
      !payees?.[schedule._payee]?.transfer_acct,
  );
  const unavailableCount = selectedIds.filter(
    id => !incomeSchedules.some(schedule => schedule.id === id),
  ).length;
  const isTracking = source === 'tracking-budget';

  return (
    <form
      data-testid="forecast-assumptions"
      onSubmit={event => {
        event.preventDefault();
        if (enabled && !isValidForecastAnchorDate(anchorDate)) {
          setError(t('Enter a valid anchor date.'));
          return;
        }
        setError('');
        onApply(
          enabled
            ? {
                anchorDate,
                inflationRate: Number(inflation) / 100,
                salaryGrowthRate: Number(salaryGrowth) / 100,
                incomeScheduleIds: selectedIds,
              }
            : undefined,
        );
      }}
      style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${theme.tableBorder}`,
        backgroundColor: theme.tableBackground,
      }}
    >
      <LabeledCheckbox
        id="forecast-assumptions-enabled"
        checked={enabled}
        onChange={event => setEnabled(event.target.checked)}
      >
        <Trans>Compare with assumptions</Trans>
      </LabeledCheckbox>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 16,
          marginTop: 10,
        }}
      >
        <label htmlFor="forecast-anchor-date">
          <Trans>Anchor date</Trans>
          <Input
            id="forecast-anchor-date"
            aria-label={t('Anchor date')}
            type="date"
            value={anchorDate}
            onChangeValue={setAnchorDate}
            required
            disabled={!enabled}
            style={{ display: 'block', marginTop: 5 }}
          />
        </label>
        <label htmlFor="forecast-inflation-rate">
          <Trans>Annual inflation (%)</Trans>
          <Input
            id="forecast-inflation-rate"
            aria-label={t('Annual inflation (%)')}
            type="number"
            min={0}
            max={100}
            step="any"
            required
            disabled={!enabled}
            value={inflation}
            onChangeValue={setInflation}
            style={{ display: 'block', marginTop: 5, width: 160 }}
          />
        </label>
        <label htmlFor="forecast-salary-growth-rate">
          <Trans>Annual salary growth (%)</Trans>
          <Input
            id="forecast-salary-growth-rate"
            aria-label={t('Annual salary growth (%)')}
            type="number"
            min={0}
            max={100}
            step="any"
            required
            disabled={!enabled || isTracking}
            value={salaryGrowth}
            onChangeValue={setSalaryGrowth}
            style={{ display: 'block', marginTop: 5, width: 160 }}
          />
        </label>
      </View>
      {!isTracking && enabled && (
        <fieldset style={{ border: 0, padding: 0, margin: '12px 0' }}>
          <legend>
            <Trans>Income schedules to grow</Trans>
          </legend>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            {incomeSchedules.map(schedule => (
              <LabeledCheckbox
                key={schedule.id}
                id={`forecast-income-${schedule.id}`}
                checked={selectedIds.includes(schedule.id)}
                style={{ flex: 'unset' }}
                onChange={event => {
                  setSelectedIds(
                    event.target.checked
                      ? [...selectedIds, schedule.id]
                      : selectedIds.filter(id => id !== schedule.id),
                  );
                }}
              >
                {schedule.name ||
                  payees?.[schedule._payee]?.name ||
                  t('Unnamed income schedule')}
              </LabeledCheckbox>
            ))}
          </View>
          {isLoading ? (
            <Trans>Loading schedules...</Trans>
          ) : scheduleError ? (
            <Trans>Could not load income schedules.</Trans>
          ) : incomeSchedules.length === 0 ? (
            <Trans>No recurring income schedules available.</Trans>
          ) : null}
          {!isLoading && unavailableCount > 0 && (
            <View style={{ color: theme.warningText }}>
              <Trans>
                Some selected schedules are no longer eligible. They will not
                receive salary growth.
              </Trans>
            </View>
          )}
        </fieldset>
      )}
      <View
        style={{
          margin: '10px 0',
          color: theme.pageTextLight,
          fontSize: 12,
          gap: 4,
        }}
      >
        <Text>
          <Trans>
            Inflation converts future balances into anchor-date purchasing
            power. Expenses stay unchanged.
          </Trans>
        </Text>
        <Text>
          {isTracking ? (
            <Trans>
              Salary growth is not applied to tracking-budget plans.
            </Trans>
          ) : (
            <Trans>
              Current schedule amounts are treated as anchor-date amounts.
              Selected recurring income grows on each anniversary, with the
              first raise one year later. Transfers and posted transactions stay
              unchanged.
            </Trans>
          )}
        </Text>
      </View>
      {error && (
        <View role="alert" style={{ color: theme.errorText }}>
          {error}
        </View>
      )}
      <Button type="submit">
        <Trans>Apply assumptions</Trans>
      </Button>
    </form>
  );
}

const scheduleQuery = q('schedules')
  .filter({ completed: false, tombstone: false })
  .select('*');
