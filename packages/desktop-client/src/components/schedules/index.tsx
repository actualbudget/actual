import React, { useState } from 'react';

import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import { useActions } from '../../hooks/useActions';
import { theme } from '../../style';
import Button from '../common/Button';
import Search from '../common/Search';
import View from '../common/View';
import { Page } from '../Page';

import {
  SchedulesTable,
  ROW_HEIGHT,
  type ScheduleItemAction,
} from './SchedulesTable';

export default function Schedules() {
  const { pushModal } = useActions();
  const [filter, setFilter] = useState('');

  const scheduleData = useSchedules();

  if (scheduleData == null) {
    return null;
  }

  const { schedules, statuses } = scheduleData;

  function onEdit(id: ScheduleEntity['id']) {
    pushModal('schedule-edit', { id });
  }

  function onAdd() {
    pushModal('schedule-edit');
  }

  function onDiscover() {
    pushModal('schedules-discover');
  }

  async function onAction(name: ScheduleItemAction, id: ScheduleEntity['id']) {
    switch (name) {
      case 'post-transaction':
        await send('schedule/post-transaction', { id });
        break;
      case 'skip':
        await send('schedule/skip-next-date', { id });
        break;
      case 'complete':
        await send('schedule/update', {
          schedule: { id, completed: true },
        });
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
          flexBasis: (ROW_HEIGHT - 1) * (Math.max(schedules.length, 1) + 1),
          marginTop: 15,
        }}
      >
        <SchedulesTable
          schedules={schedules}
          filter={filter}
          statuses={statuses}
          allowCompleted={true}
          onSelect={onEdit}
          onAction={onAction}
          style={{ backgroundColor: theme.tableBackground }}
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
        <Button type="primary" onClick={onAdd}>
          Add new schedule
        </Button>
      </View>
    </Page>
  );
}
