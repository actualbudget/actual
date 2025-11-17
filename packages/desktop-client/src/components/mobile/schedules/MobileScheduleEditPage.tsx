// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send, sendCatch } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { type RecurConfig, type ScheduleEntity } from 'loot-core/types/models';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { ScheduleEditForm } from '@desktop-client/components/schedules/ScheduleEditForm';
import { updateScheduleConditions } from '@desktop-client/components/schedules/schedule-edit-utils';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useScheduleEdit } from '@desktop-client/hooks/useScheduleEdit';
import { useSelected } from '@desktop-client/hooks/useSelected';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';

export function MobileScheduleEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { showUndoNotification } = useUndo();
  const [isLoading, setIsLoading] = useState(false);

  const adding = !id || id === 'new';

  // Create initial schedule if adding
  const initialSchedule = adding
    ? (() => {
        const date = {
          start: monthUtils.currentDay(),
          frequency: 'monthly',
          patterns: [],
          skipWeekend: false,
          weekendSolveMode: 'after',
          endMode: 'never',
          endOccurrences: 1,
          endDate: monthUtils.currentDay(),
        } satisfies RecurConfig;

        return {
          posts_transaction: false,
          _date: date,
          _conditions: [{ op: 'isapprox', field: 'date', value: date }],
          _actions: [],
        } satisfies Partial<ScheduleEntity>;
      })()
    : undefined;

  const { state, formDispatch } = useScheduleEdit({
    scheduleId: id,
    adding,
    initialSchedule,
    useGetScheduledAmount: true,
  });

  // Handle loading state - the hook loads the schedule, we just track UI state
  useEffect(() => {
    if (!adding && !state.schedule) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [adding, state.schedule]);

  // Handle error case when schedule is not found
  useEffect(() => {
    if (!adding && state.schedule === null && !isLoading) {
      // Schedule not found after loading completed
      navigate('/schedules');
    }
  }, [adding, state.schedule, isLoading, navigate]);

  const selectedInst = useSelected('transactions', state.transactions, []);

  async function onSave() {
    formDispatch({ type: 'form-error', error: null });
    if (!state.schedule) {
      return;
    }

    if (state.fields.name) {
      const { data: sameName } = await aqlQuery(
        q('schedules').filter({ name: state.fields.name }).select('id'),
      );
      if (sameName.length > 0 && sameName[0].id !== state.schedule.id) {
        formDispatch({
          type: 'form-error',
          error: t('There is already a schedule with this name'),
        });
        return;
      }
    }

    const { error, conditions } = updateScheduleConditions(
      state.schedule,
      state.fields,
    );

    if (error) {
      formDispatch({ type: 'form-error', error });
      return;
    }

    const res = await sendCatch(
      adding ? 'schedule/create' : 'schedule/update',
      {
        schedule: {
          id: state.schedule.id,
          posts_transaction: state.fields.posts_transaction,
          name: state.fields.name,
        },
        conditions,
      },
    );

    if (res.error) {
      formDispatch({
        type: 'form-error',
        error: t(
          'An error occurred while saving. Please visit https://actualbudget.org/contact/ for support.',
        ),
      });
      return;
    }

    if (adding) {
      await onLinkTransactions([...selectedInst.items], res.data);
    }

    showUndoNotification({
      message: adding
        ? t('Schedule created successfully')
        : t('Schedule saved successfully'),
    });

    // Navigate back to schedules list
    navigate('/schedules');
  }

  async function onEditRule(ruleId: string) {
    navigate(`/rules/${ruleId}`);
  }

  async function onLinkTransactions(ids: string[], scheduleId?: string) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({
        id,
        schedule: scheduleId,
      })),
    });
    selectedInst.dispatch({ type: 'select-none' });
  }

  async function onUnlinkTransactions(ids: string[]) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({ id, schedule: null })),
    });
    selectedInst.dispatch({ type: 'select-none' });
  }

  const { schedule } = state;

  if (schedule == null && !isLoading) {
    return null;
  }

  function onSwitchTransactions(mode: 'linked' | 'matched') {
    formDispatch({ type: 'switch-transactions', mode });
    selectedInst.dispatch({ type: 'select-none' });
  }

  // This is derived from the date
  const repeats =
    state.fields.date && typeof state.fields.date !== 'string'
      ? !!state.fields.date.frequency
      : false;

  const pageTitle = adding ? t('Create Schedule') : t('Edit Schedule');

  // Show loading state while fetching schedule
  if (isLoading || schedule == null) {
    return (
      <Page
        header={
          <MobilePageHeader
            title={t('Loading...')}
            leftContent={<MobileBackButton onPress={() => navigate(-1)} />}
          />
        }
        padding={0}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.mobilePageBackground,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text>
            <Trans>Loading schedule...</Trans>
          </Text>
        </View>
      </Page>
    );
  }

  return (
    <Page
      header={
        <MobilePageHeader
          title={pageTitle}
          leftContent={<MobileBackButton onPress={() => navigate(-1)} />}
        />
      }
      footer={
        <View
          style={{
            paddingLeft: styles.mobileEditingPadding,
            paddingRight: styles.mobileEditingPadding,
            paddingTop: 10,
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
            backgroundColor: theme.tableHeaderBackground,
            borderTopWidth: 1,
            borderColor: theme.tableBorder,
          }}
        >
          <Button
            variant="primary"
            onPress={onSave}
            style={{ height: styles.mobileMinHeight }}
          >
            <Trans>Save</Trans>
          </Button>
        </View>
      }
      padding={0}
    >
      <ScheduleEditForm
        fields={state.fields}
        dispatch={formDispatch}
        upcomingDates={state.upcomingDates}
        repeats={repeats}
        schedule={schedule}
        adding={adding}
        isCustom={state.isCustom ?? false}
        onEditRule={onEditRule}
        transactions={state.transactions}
        transactionsMode={state.transactionsMode}
        error={state.error}
        selectedInst={selectedInst}
        onSwitchTransactions={onSwitchTransactions}
        onLinkTransactions={onLinkTransactions}
        onUnlinkTransactions={onUnlinkTransactions}
      />
    </Page>
  );
}
