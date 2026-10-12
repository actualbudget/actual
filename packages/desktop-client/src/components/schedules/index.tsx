import React, { useCallback, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import {
  SvgCalendar,
  SvgSearchAlternate,
} from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { send } from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';
import type { ScheduleEntity } from '@actual-app/core/types/models';

import { ManagePage } from '#components/common/ManagePage';
import { PageMenuButton } from '#components/common/PageMenuButton';
import { Search } from '#components/common/Search';
import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { useSchedules } from '#hooks/useSchedules';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { SchedulesTable } from './SchedulesTable';
import type { ScheduleItemAction } from './SchedulesTable';

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
          throw new Error(`Unknown action: ${String(name)}`);
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
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <ManagePage
        actions={
          <Button variant="bare" onPress={onAdd}>
            <SvgAdd
              width={10}
              height={10}
              style={{ marginRight: spacing.xs }}
            />
            <Trans>Add new schedule</Trans>
          </Button>
        }
        search={
          <Search
            placeholder={t('Filter schedules…')}
            value={filter}
            onChange={setFilter}
          />
        }
        menu={
          <PageMenuButton<'discover' | 'upcoming-length'>
            items={[
              {
                name: 'discover',
                text: t('Find schedules'),
                icon: SvgSearchAlternate,
              },
              {
                name: 'upcoming-length',
                text: t('Change upcoming length'),
                icon: SvgCalendar,
              },
            ]}
            onMenuSelect={name => {
              if (name === 'discover') {
                onDiscover();
              } else {
                onChangeUpcomingLength();
              }
            }}
          />
        }
      >
        <SchedulesTable
          isLoading={isSchedulesLoading}
          schedules={schedules}
          filter={filter}
          statuses={statuses}
          allowCompleted
          onSelect={onEdit}
          onAction={onAction}
          style={{ backgroundColor: theme.tableBackground }}
        />
      </ManagePage>
    </ErrorBoundary>
  );
}
