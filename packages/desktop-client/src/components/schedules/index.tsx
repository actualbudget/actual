import React, { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { q } from 'loot-core/shared/query';
import { type ScheduleEntity } from 'loot-core/types/models';

import { type ScheduleItemAction, SchedulesTable } from './SchedulesTable';

import { Search } from '@desktop-client/components/common/Search';
import { Page } from '@desktop-client/components/Page';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export function Schedules() {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const [filter, setFilter] = useState('');

  const onEdit = useCallback(
    (id: ScheduleEntity['id']) => {
      dispatch(
        pushModal({ modal: { name: 'schedule-edit', options: { id } } }),
      );
    },
    [dispatch],
  );

  const onAdd = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'schedule-edit', options: {} } }));
  }, [dispatch]);

  const onDiscover = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'schedules-discover' } }));
  }, [dispatch]);

  const onChangeUpcomingLength = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'schedules-upcoming-length' } }));
  }, [dispatch]);

  const onAction = useCallback(
    async (name: ScheduleItemAction, id: ScheduleEntity['id']) => {
      switch (name) {
        case 'post-transaction':
          await send('schedule/post-transaction', { id });
          break;
        case 'post-transaction-today':
          await send('schedule/post-transaction', { id, today: true });
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: '1em',
          }}
        >
          <Button onPress={onDiscover}>
            <Trans>Find schedules</Trans>
          </Button>
          <Button onPress={onChangeUpcomingLength}>
            <Trans>Change upcoming length</Trans>
          </Button>
        </View>
        <Button variant="primary" onPress={onAdd}>
          <Trans>Add new schedule</Trans>
        </Button>
      </View>
    </Page>
  );
}
