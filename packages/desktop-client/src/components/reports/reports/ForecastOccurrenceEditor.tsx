import { useId, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { q } from '@actual-app/core/shared/query';

import { useSchedules } from '#hooks/useSchedules';

import { ForecastOccurrenceForm } from './ForecastOccurrenceForm';

export function ForecastOccurrenceEditor() {
  const { t } = useTranslation();
  const id = useId();
  const { schedules, isLoading, error } = useSchedules({
    query: q('schedules').filter({ completed: false }).select('*'),
  });
  const [scheduleId, setScheduleId] = useState('');
  const schedule = schedules.find(schedule => schedule.id === scheduleId);
  return (
    <View
      role="group"
      aria-label={t('Occurrence records')}
      style={{
        gap: 12,
        color: theme.pageText,
        borderTop: `1px solid ${theme.tableBorder}`,
        paddingTop: 12,
      }}
    >
      <div>
        <Trans>
          Record which occurrence a payment belongs to, or mark an occurrence as
          skipped. This changes forecast matching without moving the schedule or
          editing transactions.
        </Trans>
      </div>
      {error ? (
        <div role="alert">
          {t('Could not load schedules. Reopen the editor to retry.')}
        </div>
      ) : isLoading ? (
        <div>
          <Trans>Loading schedules…</Trans>
        </div>
      ) : schedules.length === 0 ? (
        <div>
          <Trans>Create a schedule to try occurrence matching.</Trans>
        </div>
      ) : (
        <>
          <View style={{ gap: 5, maxWidth: 320 }}>
            <label htmlFor={`${id}-schedule`}>
              <Trans>Schedule to review</Trans>
            </label>
            <Select
              id={`${id}-schedule`}
              value={scheduleId}
              defaultLabel={t('Choose a schedule')}
              onChange={setScheduleId}
              options={schedules.map(schedule => [
                schedule.id,
                schedule.name || t('Unnamed schedule'),
              ])}
            />
          </View>
          {schedule && (
            <ForecastOccurrenceForm key={schedule.id} schedule={schedule} />
          )}
        </>
      )}
    </View>
  );
}
