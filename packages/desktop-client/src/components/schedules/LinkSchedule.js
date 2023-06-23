import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';

import { Search, Text, View } from '../common';
import { Page } from '../Page';

import { SchedulesTable } from './SchedulesTable';

export default function ScheduleLink() {
  let location = useLocation();
  let navigate = useNavigate();
  let scheduleData = useSchedules(
    useCallback(query => query.filter({ completed: false }), []),
  );

  let [filter, setFilter] = useState('');

  if (scheduleData == null) {
    return null;
  }

  let { schedules, statuses } = scheduleData;

  async function onSelect(scheduleId) {
    let { state } = location;
    let ids = state.transactionIds;
    if (ids && ids.length > 0) {
      await send('transactions-batch-update', {
        updated: ids.map(id => ({ id, schedule: scheduleId })),
      });
    }
    navigate(-1);
  }

  return (
    <Page title="Link Schedule" modalSize="medium">
      <View
        style={{ flexDirection: 'row', marginBottom: 20, alignItems: 'center' }}
      >
        <Text>Choose a schedule to link these transactions to:</Text>
        <View style={{ flex: 1 }} />
        <Search
          isInModal
          width={300}
          placeholder="Filter schedules…"
          value={filter}
          onChange={setFilter}
        />
      </View>

      <SchedulesTable
        schedules={schedules}
        filter={filter}
        statuses={statuses}
        minimal={true}
        onSelect={onSelect}
        tableStyle={{ marginInline: -20 }}
      />
    </Page>
  );
}
