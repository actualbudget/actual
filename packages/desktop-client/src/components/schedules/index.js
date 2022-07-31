import React, { useMemo, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  View,
  Text,
  Button,
  Tooltip,
  Menu
} from '@actual-app/loot-design/src/components/common';
import { colors, styles } from '@actual-app/loot-design/src/style';
import { send } from '@actual-app/loot-core/src/platform/client/fetch';
import { Page } from '../Page';
import { useSchedules } from '@actual-app/loot-core/src/client/data-hooks/schedules';
import { SchedulesTable, ROW_HEIGHT } from './SchedulesTable';

export default function Schedules() {
  let history = useHistory();

  let scheduleData = useSchedules();

  if (scheduleData == null) {
    return null;
  }

  let { schedules, statuses } = scheduleData;

  function onEdit(id) {
    history.push(`/schedule/edit/${id}`, { locationPtr: history.location });
  }

  function onAdd() {
    history.push(`/schedule/edit`, { locationPtr: history.location });
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
          resetNextDate: true
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
      <View
        style={{
          marginTop: 20,
          flexBasis: (ROW_HEIGHT - 1) * (Math.max(schedules.length, 1) + 1),
          overflow: 'hidden'
        }}
      >
        <SchedulesTable
          schedules={schedules}
          statuses={statuses}
          allowCompleted={true}
          onSelect={onEdit}
          onAction={onAction}
          style={{ backgroundColor: 'white' }}
        />
      </View>

      <View style={{ alignItems: 'flex-end', margin: '20px 0', flexShrink: 0 }}>
        <Button primary onClick={onAdd}>
          Add new schedule
        </Button>
      </View>
    </Page>
  );
}
