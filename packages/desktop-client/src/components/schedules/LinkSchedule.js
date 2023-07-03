import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';

import { Modal, Search, Text, View } from '../common';

import { SchedulesTable } from './SchedulesTable';

export default function ScheduleLink({ modalProps, transactionIds: ids }) {
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
    if (ids && ids.length > 0) {
      await send('transactions-batch-update', {
        updated: ids.map(id => ({ id, schedule: scheduleId })),
      });
    }
    navigate(-1);
  }

  return (
    <Modal title="Link Schedule" size="medium" {...modalProps}>
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
    </Modal>
  );
}
