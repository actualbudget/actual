import React, { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { format as monthUtilFormat } from '@actual-app/core/shared/months';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import { q } from '@actual-app/core/shared/query';
import { getScheduledAmount } from '@actual-app/core/shared/schedules';
import type { ScheduleEntity } from '@actual-app/core/types/models';

import { Search } from '#components/common/Search';
import { MobilePageHeader, Page } from '#components/Page';
import { useAccounts } from '#hooks/useAccounts';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { usePayees } from '#hooks/usePayees';
import { useSchedules } from '#hooks/useSchedules';
import { useUndo } from '#hooks/useUndo';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { AddScheduleButton } from './AddScheduleButton';
import { SchedulesList } from './SchedulesList';

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
