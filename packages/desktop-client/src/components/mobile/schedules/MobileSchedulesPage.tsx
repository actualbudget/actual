import React, { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import { format as monthUtilFormat } from 'loot-core/shared/months';
import { getNormalisedString } from 'loot-core/shared/normalisation';
import { q } from 'loot-core/shared/query';
import { getScheduledAmount } from 'loot-core/shared/schedules';
import type { ScheduleEntity } from 'loot-core/types/models';

import { AddScheduleButton } from './AddScheduleButton';
import { SchedulesList } from './SchedulesList';

import { Search } from '@desktop-client/components/common/Search';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

export function MobileSchedulesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const [filter, setFilter] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const format = useFormat();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const {
    isLoading: isSchedulesLoading,
    schedules,
    statuses,
  } = useSchedules({ query: schedulesQuery });

  const { data: payees = [] } = usePayees();
  const { data: accounts = [] } = useAccounts();

  const filterIncludes = (str: string | null | undefined) =>
    str
      ? getNormalisedString(str).includes(getNormalisedString(filter)) ||
        getNormalisedString(filter).includes(getNormalisedString(str))
      : false;

  const baseSchedules = filter
    ? schedules.filter(schedule => {
        const payee = payees.find(p => schedule._payee === p.id);
        const account = accounts.find(a => schedule._account === a.id);
        const amount = getScheduledAmount(schedule._amount);
        const amountStr =
          (schedule._amountOp === 'isapprox' ||
          schedule._amountOp === 'isbetween'
            ? '~'
            : '') +
          (amount > 0 ? '+' : '') +
          format(Math.abs(amount || 0), 'financial');
        const dateStr = schedule.next_date
          ? monthUtilFormat(schedule.next_date, dateFormat)
          : null;
        const statusLabel = statuses.get(schedule.id);

        return (
          filterIncludes(schedule.name) ||
          filterIncludes(payee?.name) ||
          filterIncludes(account?.name) ||
          filterIncludes(amountStr) ||
          filterIncludes(statusLabel) ||
          filterIncludes(dateStr)
        );
      })
    : schedules;
  const hasCompletedSchedules = baseSchedules.some(
    schedule => schedule.completed,
  );
  const filteredSchedules = showCompleted
    ? baseSchedules
    : baseSchedules.filter(schedule => !schedule.completed);

  const handleSchedulePress = useCallback(
    (schedule: ScheduleEntity) => {
      void navigate(`/schedules/${schedule.id}`);
    },
    [navigate],
  );

  const handleScheduleDelete = useCallback(
    async (schedule: ScheduleEntity) => {
      try {
        await send('schedule/delete', { id: schedule.id });
        showUndoNotification({
          message: t('Schedule deleted successfully'),
        });
      } catch (error) {
        console.error('Failed to delete schedule:', error);
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Failed to delete schedule. Please try again.'),
            },
          }),
        );
      }
    },
    [dispatch, showUndoNotification, t],
  );

  return (
    <Page
      header={
        <MobilePageHeader
          title={
            <Text style={{ ...styles.underlinedText, fontSize: 16 }}>
              <Trans>Schedules</Trans>
            </Text>
          }
          rightContent={<AddScheduleButton />}
        />
      }
      padding={0}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.mobilePageBackground,
          padding: 10,
          width: '100%',
          borderBottomWidth: 2,
          borderBottomStyle: 'solid',
          borderBottomColor: theme.tableBorder,
        }}
      >
        <Search
          placeholder={t('Filter schedules…')}
          value={filter}
          onChange={setFilter}
          width="100%"
          height={styles.mobileMinHeight}
          style={{
            backgroundColor: theme.tableBackground,
            borderColor: theme.formInputBorder,
          }}
        />
      </View>
      <SchedulesList
        schedules={filteredSchedules}
        isLoading={isSchedulesLoading}
        statuses={statuses}
        onSchedulePress={handleSchedulePress}
        onScheduleDelete={handleScheduleDelete}
        hasCompletedSchedules={hasCompletedSchedules}
        showCompleted={showCompleted}
        onShowCompleted={() => setShowCompleted(true)}
      />
    </Page>
  );
}
