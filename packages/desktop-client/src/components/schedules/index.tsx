import React, { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import { q } from 'loot-core/shared/query';
import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { send } from 'loot-core/src/platform/client/fetch';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Search } from '../common/Search';
import { View } from '../common/View';
import { Page } from '../Page';
import { UpcomingLengthSettings } from '../settings/Upcoming';

import { type ScheduleItemAction, SchedulesTable } from './SchedulesTable';

export function Schedules() {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const [filter, setFilter] = useState('');

  const onEdit = useCallback(
    (id: ScheduleEntity['id']) => {
      dispatch(pushModal('schedule-edit', { id }));
    },
    [dispatch],
  );

  const onAdd = useCallback(() => {
    dispatch(pushModal('schedule-edit'));
  }, [dispatch]);

  const onDiscover = useCallback(() => {
    dispatch(pushModal('schedules-discover'));
  }, [dispatch]);

  const onAction = useCallback(
    async (name: ScheduleItemAction, id: ScheduleEntity['id']) => {
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
          throw new Error(`Unknown action: ${name}`);
      }
    },
    [],
  );

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const {
    isLoading: isSchedulesLoading,
    schedules,
    statuses,
  } = useSchedules({ query: schedulesQuery });

  return (
    <Page header={t('Schedules')}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: '0 0 15px',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: '15px 0 0',
          }}
        >
          <UpcomingLengthSettings />
        </View>
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
        isLoading={isSchedulesLoading}
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
