import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { View } from '@actual-app/components/view';

import { q } from 'loot-core/shared/query';
import { describeSchedule } from 'loot-core/shared/schedules';
import { type ScheduleEntity } from 'loot-core/types/models';

import { Value } from './Value';

import { usePayees } from '@desktop-client/hooks/usePayees';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { getPayeesById } from '@desktop-client/queries/queriesSlice';

type ScheduleValueProps = {
  value: ScheduleEntity;
};

export function ScheduleValue({ value }: ScheduleValueProps) {
  const { t } = useTranslation();
  const payees = usePayees();
  const byId = getPayeesById(payees);
  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const { schedules = [], isLoading } = useSchedules({ query: schedulesQuery });

  if (isLoading) {
    return (
      <View aria-label={t('Loading...')} style={{ display: 'inline-flex' }}>
        <AnimatedLoading width={10} height={10} />
      </View>
    );
  }

  return (
    <Value
      value={value}
      field="rule"
      data={schedules}
      // TODO: this manual type coercion does not make much sense -
      // should we instead do `schedule._payee.id`?
      describe={schedule =>
        describeSchedule(schedule, byId[schedule._payee as unknown as string])
      }
    />
  );
}
