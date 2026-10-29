import { useId, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
  ForecastOccurrenceMatching,
} from '@actual-app/core/types/models/forecast';

import { ForecastOccurrenceEditor } from './ForecastOccurrenceEditor';

type BalanceForecastMissedSchedulesProps = {
  missedSchedules: ForecastMissedSchedules;
  missedOccurrences: ForecastMissedOccurrences;
  occurrenceMatching: ForecastOccurrenceMatching;
  onSchedulesChange: (value: ForecastMissedSchedules) => void;
  onOccurrencesChange: (value: ForecastMissedOccurrences) => void;
  onMatchingChange: (value: ForecastOccurrenceMatching) => void;
};

export function BalanceForecastMissedSchedules({
  missedSchedules,
  missedOccurrences,
  occurrenceMatching,
  onSchedulesChange,
  onOccurrencesChange,
  onMatchingChange,
}: BalanceForecastMissedSchedulesProps) {
  const { t } = useTranslation();
  const id = useId();
  const [isEditingOccurrences, setIsEditingOccurrences] = useState(false);
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
        <View style={{ gap: 5, flex: '1 1 220px', maxWidth: 320 }}>
          <label htmlFor={`${id}-matching`}>
            <Trans>Payment matching (experimental)</Trans>
          </label>
          <Select
            id={`${id}-matching`}
            value={occurrenceMatching}
            onChange={onMatchingChange}
            disabled={missedSchedules === 'exclude'}
            options={[
              ['recorded', t('Use recorded occurrences')],
              ['inferred', t('Infer from dates')],
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
          <div>
            {occurrenceMatching === 'recorded' ? (
              <Trans>
                Records new skips and posted occurrences while Balance Forecast
                is enabled. Older and manually linked payments still use
                date-based assumptions unless you record their occurrence.
              </Trans>
            ) : (
              <Trans>
                Ignores occurrence records. Matches exact dates first, then
                early payments, then late payments to the oldest missed
                occurrence. Skipped history can be mistaken for a payment.
              </Trans>
            )}
          </div>
          {occurrenceMatching === 'recorded' && (
            <>
              <Button
                variant="bare"
                aria-expanded={isEditingOccurrences}
                onPress={() => setIsEditingOccurrences(!isEditingOccurrences)}
                style={{ alignSelf: 'flex-start' }}
              >
                {isEditingOccurrences ? (
                  <Trans>Hide occurrence editor</Trans>
                ) : (
                  <Trans>Review occurrences</Trans>
                )}
              </Button>
              {isEditingOccurrences && <ForecastOccurrenceEditor />}
            </>
          )}
        </View>
      )}
    </View>
  );
}
