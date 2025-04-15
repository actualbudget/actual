import React, { useMemo } from 'react';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { View } from '@actual-app/components/view';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { q } from 'loot-core/shared/query';
import { describeSchedule } from 'loot-core/shared/schedules';
import { type ScheduleEntity } from 'loot-core/types/models';

import { getPayeesById } from '../../queries/queriesSlice';

import { Value } from './Value';

import { usePayees } from '@desktop-client/hooks/usePayees';

type ScheduleValueProps = {
  value: ScheduleEntity;
};

export function ScheduleValue({ value }: ScheduleValueProps) {
  const payees = usePayees();
  const byId = getPayeesById(payees);
  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const { schedules = [], isLoading } = useSchedules({ query: schedulesQuery });

  if (isLoading) {
    return (
      <View aria-label="Loading..." style={{ display: 'inline-flex' }}>
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
