import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  getForecastRange,
  summarizeForecastContributors,
} from '@actual-app/core/shared/forecast-contributors';
import type { ForecastResult } from '@actual-app/core/types/models/forecast';

import { ForecastAmount } from '#components/reports/reports/ForecastAmount';
import { ForecastContributorsTable } from '#components/reports/reports/ForecastContributorsTable';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type BalanceForecastContributorsProps = {
  forecast: ForecastResult;
  start: string;
  end: string;
  granularity: 'Daily' | 'Monthly';
  isUpdating: boolean;
};

export function BalanceForecastContributors({
  forecast,
  start,
  end,
  granularity,
  isUpdating,
}: BalanceForecastContributorsProps) {
  const dispatch = useDispatch();
  const { startDate, endDate } = getForecastRange(start, end, granularity);
  const summary = summarizeForecastContributors(
    forecast.dataPoints,
    startDate,
    endDate,
  );
  if (!summary) {
    return null;
  }

  function onEditSchedule(id: string) {
    dispatch(pushModal({ modal: { name: 'schedule-edit', options: { id } } }));
  }

  return (
    <section
      aria-labelledby="forecast-contributors-heading"
      aria-busy={isUpdating}
      data-testid="forecast-contributors"
      style={{ marginTop: 24, opacity: isUpdating ? 0.45 : 1 }}
    >
      <h2
        id="forecast-contributors-heading"
        style={{ fontSize: 16, margin: '0 0 8px' }}
      >
        <Trans>What drives this forecast?</Trans>
      </h2>
      <View
        style={{ color: theme.pageTextLight, fontSize: 12, marginBottom: 12 }}
      >
        <Trans>
          Upcoming schedules follow this report's range and filters. Select a
          schedule to edit it. Recorded occurrences are excluded from scheduled
          changes; transfers between included accounts cancel out.
        </Trans>
      </View>
      <dl
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 32px',
          margin: '0 0 16px',
        }}
      >
        {[
          {
            label: <Trans>Opening balance</Trans>,
            amount: summary.openingBalance,
          },
          {
            label: <Trans>Recorded transactions (net)</Trans>,
            amount: summary.recordedNet,
          },
          {
            label: <Trans>Scheduled changes (net)</Trans>,
            amount: summary.scheduledNet,
          },
          {
            label: <Trans>Ending balance</Trans>,
            amount: summary.endingBalance,
          },
        ].map(({ label, amount }, index) => (
          <div key={index}>
            <dt
              style={{
                color: theme.pageTextLight,
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              {label}
            </dt>
            <dd style={{ margin: 0 }}>
              <ForecastAmount amount={amount} />
            </dd>
          </div>
        ))}
      </dl>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
        <ForecastContributorsTable
          key={`inflow-${startDate}-${endDate}`}
          direction="inflow"
          contributors={summary.inflows}
          onEditSchedule={onEditSchedule}
          isUpdating={isUpdating}
        />
        <ForecastContributorsTable
          key={`outflow-${startDate}-${endDate}`}
          direction="outflow"
          contributors={summary.outflows}
          onEditSchedule={onEditSchedule}
          isUpdating={isUpdating}
        />
      </View>
      {summary.internalTransferCount > 0 && (
        <View
          style={{ color: theme.pageTextLight, fontSize: 12, marginTop: 8 }}
        >
          <Trans count={summary.internalTransferCount}>
            {{ count: summary.internalTransferCount }} internal transfer
            occurrences have no net effect.
          </Trans>
        </View>
      )}
    </section>
  );
}
