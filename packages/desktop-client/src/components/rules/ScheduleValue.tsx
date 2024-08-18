import React from 'react';

import { getPayeesById } from 'loot-core/src/client/reducers/queries';
import { describeSchedule } from 'loot-core/src/shared/schedules';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import { usePayees } from '../../hooks/usePayees';

import { SchedulesQuery } from './SchedulesQuery';
import { Value } from './Value';
import { useLocalPref } from '../../hooks/useLocalPref';

type ScheduleValueProps = {
  value: ScheduleEntity;
};

export function ScheduleValue({ value }: ScheduleValueProps) {
  const payees = usePayees();
  const byId = getPayeesById(payees);
  const { data: schedules } = SchedulesQuery.useQuery();
  const [accountGroupDisplay] = useLocalPref('ui.accountGroupDisplayName');

  return (
    <Value
      value={value}
      field="rule"
      data={schedules}
      accountGroupDisplayName={accountGroupDisplay}
      // TODO: this manual type coercion does not make much sense -
      // should we instead do `schedule._payee.id`?
      describe={schedule =>
        describeSchedule(schedule, byId[schedule._payee as unknown as string])
      }
    />
  );
}
