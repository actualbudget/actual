import React, { useMemo } from 'react';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { q } from 'loot-core/shared/query';
import { getPayeesById } from 'loot-core/src/client/reducers/queries';
import { describeSchedule } from 'loot-core/src/shared/schedules';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import { usePayees } from '../../hooks/usePayees';
import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { View } from '../common/View';

import { Value } from './Value';

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
