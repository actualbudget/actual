import React, { useMemo } from 'react';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { q } from 'loot-core/shared/query';
import { getPayeesById } from 'loot-core/src/client/reducers/queries';
import { describeSchedule } from 'loot-core/src/shared/schedules';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import { usePayees } from '../../hooks/usePayees';

import { Value } from './Value';

type ScheduleValueProps = {
  value: ScheduleEntity;
};

export function ScheduleValue({ value }: ScheduleValueProps) {
  const payees = usePayees();
  const byId = getPayeesById(payees);
  const { schedules = [], isLoading } = useSchedules({
    query: useMemo(() => q('schedules').select('*'), []),
  });

  if (isLoading) {
    return null;
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
