import { useId } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
  ForecastResult,
} from '@actual-app/core/types/models/forecast';

type BalanceForecastMissedSchedulesProps = {
  missedSchedules: ForecastMissedSchedules;
  missedOccurrences: ForecastMissedOccurrences;
  unsupportedReason?: ForecastResult['missedSchedulesUnsupported'];
  onMissedSchedulesChange: (value: ForecastMissedSchedules) => void;
  onMissedOccurrencesChange: (value: ForecastMissedOccurrences) => void;
};

export function BalanceForecastMissedSchedules({
  missedSchedules,
  missedOccurrences,
  unsupportedReason,
  onMissedSchedulesChange,
  onMissedOccurrencesChange,
}: BalanceForecastMissedSchedulesProps) {
  const { t } = useTranslation();
  const id = useId();
  const isIncluded = missedSchedules !== 'exclude';

  return (
    <View
      data-testid="forecast-missed-schedules"
      style={{ gap: 8, paddingTop: 16 }}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ gap: 4, flex: '1 1 220px', maxWidth: 320 }}>
          <label htmlFor={`${id}-schedules`}>
            <Trans>Missed schedules (experimental)</Trans>
          </label>
          <Select
            id={`${id}-schedules`}
            value={missedSchedules}
            onChange={onMissedSchedulesChange}
            options={[
              ['exclude', t('Leave out')],
              ['payments', t('Include payments and transfers')],
              ['all', t('Include all, including income')],
            ]}
          />
        </View>
        <View style={{ gap: 4, flex: '1 1 220px', maxWidth: 320 }}>
          <label htmlFor={`${id}-occurrences`}>
            <Trans>Occurrences per schedule</Trans>
          </label>
          <Select
            id={`${id}-occurrences`}
            value={missedOccurrences}
            onChange={onMissedOccurrencesChange}
            disabled={!isIncluded}
            options={[
              ['one', t('Oldest missed only')],
              ['all', t('Every missed occurrence')],
            ]}
          />
        </View>
      </View>
      {isIncluded && (
        <View style={{ gap: 4, fontSize: 12, color: theme.pageTextLight }}>
          {unsupportedReason === 'today-outside-range' ? (
            <div style={{ color: theme.pageText }}>
              <Trans>
                Missed schedules are not included because this range does not
                include today. Choose a range that includes today to compare
                them.
              </Trans>
            </div>
          ) : (
            <div>
              <Trans>
                Included missed schedules are assumed to be paid today at their
                current amount. Nothing is changed in your schedules or
                transactions.
              </Trans>
            </div>
          )}
          {missedSchedules === 'payments' && (
            <div>
              <Trans>
                Missed income is left out. Transfers are included and still
                cancel out between selected accounts.
              </Trans>
            </div>
          )}
          <div>
            <Trans>
              Only schedules shown as missed count. Skipped occurrences cannot
              be reconstructed. Once a payment is linked, even a late or partial
              one, the schedule counts as paid and none of its earlier
              occurrences are included.
            </Trans>
          </div>
          <div>
            <Trans>
              Matching payments to individual occurrences is not available,
              because Actual does not record which occurrence a payment covers.
            </Trans>
          </div>
        </View>
      )}
    </View>
  );
}
