import React from 'react';
import { useSelector } from 'react-redux';

import { getPayeesById } from 'loot-core/src/client/reducers/queries';
import { describeSchedule } from 'loot-core/src/shared/schedules';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import { SchedulesQuery } from './SchedulesQuery';
import { Value } from './Value';

type ScheduleValueProps = {
  value: ScheduleEntity;
};

export function ScheduleValue({ value }: ScheduleValueProps) {
  const payees = useSelector(state => state.queries.payees);
  const byId = getPayeesById(payees);
  const { data: schedules } = SchedulesQuery.useQuery();

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
