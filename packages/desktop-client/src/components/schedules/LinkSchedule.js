import React, { useCallback } from 'react';
import { useLocation, useHistory } from 'react-router-dom';

import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';
import { Text } from 'loot-design/src/components/common';

import { Page } from '../Page';

import { SchedulesTable } from './SchedulesTable';

export default function ScheduleLink() {
  let location = useLocation();
  let history = useHistory();
  let scheduleData = useSchedules(
    useCallback(query => query.filter({ completed: false }), [])
  );

  if (scheduleData == null) {
    return null;
  }

  let { schedules, statuses } = scheduleData;

  async function onSelect(scheduleId) {
    let { state } = location;
    let ids = state.transactionIds;
    if (ids && ids.length > 0) {
      await send('transactions-batch-update', {
        updated: ids.map(id => ({ id, schedule: scheduleId }))
      });
    }
    history.goBack();
  }

  return (
    <Page title="Link Schedule" modalSize="medium">
      <Text style={{ marginBottom: 20 }}>
        Choose a schedule to link these transactions to:
      </Text>

      <SchedulesTable
        schedules={schedules}
        statuses={statuses}
        minimal={true}
        onSelect={onSelect}
      />
    </Page>
  );
}
