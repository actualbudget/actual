import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import { useActions } from '../../hooks/useActions';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Search } from '../common/Search';
import { View } from '../common/View';
import { Page } from '../Page';

import { SchedulesTable, type ScheduleItemAction } from './SchedulesTable';

export function Schedules() {
  const { t } = useTranslation();

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
    <Page header="Schedules">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0 0 15px',
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'flex-end',
          }}
        >
          <Search
            placeholder={t('Filter schedules…')}
            value={filter}
            onChange={setFilter}
          />
        </View>
      </View>

      <SchedulesTable
        schedules={schedules}
        filter={filter}
        statuses={statuses}
        allowCompleted={true}
        onSelect={onEdit}
        onAction={onAction}
        style={{ backgroundColor: theme.tableBackground }}
      />

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          margin: '20px 0',
          flexShrink: 0,
        }}
      >
        <Button onPress={onDiscover}>
          <Trans>Find schedules</Trans>
        </Button>
        <Button variant="primary" onPress={onAdd}>
          <Trans>Add new schedule</Trans>
        </Button>
      </View>
    </Page>
  );
}
