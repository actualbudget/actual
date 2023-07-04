import React, { useState } from 'react';

import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';

import { usePushModal } from '../../util/router-tools';
import { View, Button, Search } from '../common';
import { Page } from '../Page';

import { SchedulesTable, ROW_HEIGHT } from './SchedulesTable';

export default function Schedules() {
  let pushModal = usePushModal();

  let [filter, setFilter] = useState('');

  let scheduleData = useSchedules();

  if (scheduleData == null) {
    return null;
  }

  let { schedules, statuses } = scheduleData;

  function onEdit(id) {
    pushModal(`/schedule/edit/${id}`);
  }

  function onAdd() {
    pushModal('/schedule/edit');
  }

  function onDiscover() {
    pushModal('/schedule/discover');
  }

  async function onAction(name, id) {
    switch (name) {
      case 'post-transaction':
        await send('schedule/post-transaction', { id });
        break;
      case 'skip':
        await send('schedule/skip-next-date', { id });
        break;
      case 'complete':
        await send('schedule/update', { schedule: { id, completed: true } });
        break;
      case 'restart':
        await send('schedule/update', {
          schedule: { id, completed: false },
          resetNextDate: true,
        });
        break;
      case 'delete':
        await send('schedule/delete', { id });
        break;
      default:
    }
  }

  return (
    <Page title="Schedules">
      <View style={{ alignItems: 'flex-end' }}>
        <Search
          placeholder="Filter schedules…"
          value={filter}
          onChange={setFilter}
        />
      </View>

      <View
        style={{
          marginTop: 20,
          flexBasis: (ROW_HEIGHT - 1) * (Math.max(schedules.length, 1) + 1),
          overflow: 'hidden',
        }}
      >
        <SchedulesTable
          schedules={schedules}
          filter={filter}
          statuses={statuses}
          allowCompleted={true}
          onSelect={onEdit}
          onAction={onAction}
          style={{ backgroundColor: 'white' }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          margin: '20px 0',
          flexShrink: 0,
        }}
      >
        <Button onClick={onDiscover}>Find schedules</Button>
        <Button primary onClick={onAdd}>
          Add new schedule
        </Button>
      </View>
    </Page>
  );
}
