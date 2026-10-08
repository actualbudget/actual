import { useId } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
} from '@actual-app/core/types/models/forecast';

type BalanceForecastMissedSchedulesProps = {
  missedSchedules: ForecastMissedSchedules;
  missedOccurrences: ForecastMissedOccurrences;
  onSchedulesChange: (value: ForecastMissedSchedules) => void;
  onOccurrencesChange: (value: ForecastMissedOccurrences) => void;
};

export function BalanceForecastMissedSchedules({
  missedSchedules,
  missedOccurrences,
  onSchedulesChange,
  onOccurrencesChange,
}: BalanceForecastMissedSchedulesProps) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <View style={{ gap: 10, paddingTop: 16, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ gap: 5, flex: '1 1 220px', maxWidth: 320 }}>
          <label htmlFor={`${id}-schedules`}>
            <Trans>Include missed schedules</Trans>
          </label>
          <Select
            id={`${id}-schedules`}
            value={missedSchedules}
            onChange={onSchedulesChange}
            options={[
              ['exclude', t('None')],
              ['payments', t('Payments and transfers')],
              ['all', t('All, including income')],
            ]}
          />
        </View>
        <View style={{ gap: 5, flex: '1 1 220px', maxWidth: 320 }}>
          <label htmlFor={`${id}-occurrences`}>
            <Trans>Occurrences per schedule</Trans>
          </label>
          <Select
            id={`${id}-occurrences`}
            value={missedOccurrences}
            onChange={onOccurrencesChange}
            disabled={missedSchedules === 'exclude'}
            options={[
              ['one', t('One (oldest unmatched)')],
              ['all', t('All unmatched')],
            ]}
          />
        </View>
      </View>
      {missedSchedules !== 'exclude' && (
        <View style={{ gap: 4, fontSize: 12, color: theme.pageTextLight }}>
          <div>
            <Trans>Assume included missed occurrences happen today.</Trans>
          </div>
          {missedSchedules === 'payments' && (
            <div>
              <Trans>
                Overdue income from outside your accounts is excluded.
              </Trans>
            </div>
          )}
          <div>
            <Trans>
              Uses current schedule amounts. Occurrences already advanced or
              skipped are not reconstructed. Partial payments are treated as one
              paid occurrence.
            </Trans>
          </div>
        </View>
      )}
    </View>
  );
}
