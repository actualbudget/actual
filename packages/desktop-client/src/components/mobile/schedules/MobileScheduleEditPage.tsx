// @ts-strict-ignore
import React, { useEffect, useReducer, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useParams } from 'react-router';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { t } from 'i18next';

import { send, sendCatch } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  extractScheduleConds,
  getScheduledAmount,
} from 'loot-core/shared/schedules';
import {
  type TransactionEntity,
  type ScheduleEntity,
  type RuleConditionOp,
  type RecurConfig,
} from 'loot-core/types/models';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import {
  ScheduleEditForm,
  type ScheduleFormFields,
} from '@desktop-client/components/schedules/ScheduleEditForm';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useSelected } from '@desktop-client/hooks/useSelected';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import { liveQuery } from '@desktop-client/queries/liveQuery';
import { useDispatch } from '@desktop-client/redux';

type Fields = ScheduleFormFields;

function updateScheduleConditions(
  schedule: Partial<ScheduleEntity>,
  fields: Fields,
): { error?: string; conditions?: unknown[] } {
  const conds = extractScheduleConds(schedule._conditions);

  const updateCond = (
    cond: ReturnType<typeof extractScheduleConds>[keyof ReturnType<
      typeof extractScheduleConds
    >],
    op: RuleConditionOp,
    field: string,
    value: (typeof fields)[keyof typeof fields],
  ) => {
    if (cond) {
      return { ...cond, value };
    }

    if (value != null || field === 'payee') {
      return { op, field, value };
    }

    return null;
  };

  // Validate
  if (fields.date == null) {
    return { error: t('Date is required'), conditions: [] };
  }

  if (fields.amount == null) {
    return { error: t('A valid amount is required'), conditions: [] };
  }

  return {
    conditions: [
      updateCond(conds.payee, 'is', 'payee', fields.payee),
      updateCond(conds.account, 'is', 'account', fields.account),
      updateCond(conds.date, 'isapprox', 'date', fields.date),
      // We don't use `updateCond` for amount because we want to
      // overwrite it completely
      {
        op: fields.amountOp || 'isapprox',
        field: 'amount',
        value: fields.amount,
      },
    ].filter(val => !!val),
  };
}

export function MobileScheduleEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const [isLoading, setIsLoading] = useState(false);

  const adding = !id || id === 'new';

  const [state, formDispatch] = useReducer(
    (
      state: {
        isCustom?: boolean;
        schedule: null | Partial<ScheduleEntity>;
        upcomingDates: null | string[];
        error: null | string;
        fields: Fields;
        transactions: TransactionEntity[];
        transactionsMode: 'matched' | 'linked';
      },
      action:
        | {
            type: 'set-schedule';
            schedule: Partial<ScheduleEntity>;
          }
        | {
            type: 'set-field';
            field: 'name' | 'account' | 'payee';
            value: string;
          }
        | {
            type: 'set-field';
            field: 'amountOp';
            value: 'is' | 'isbetween' | 'isapprox';
          }
        | {
            type: 'set-field';
            field: 'amount';
            value: number | { num1: number; num2: number };
          }
        | {
            type: 'set-field';
            field: 'date';
            value: string | RecurConfig;
          }
        | {
            type: 'set-field';
            field: 'posts_transaction';
            value: boolean;
          }
        | {
            type: 'set-transactions';
            transactions: TransactionEntity[];
          }
        | {
            type: 'set-repeats';
            repeats: boolean;
          }
        | {
            type: 'set-upcoming-dates';
            dates: null | string[];
          }
        | {
            type: 'form-error';
            error: null | string;
          }
        | {
            type: 'switch-transactions';
            mode: 'matched' | 'linked';
          },
    ) => {
      switch (action.type) {
        case 'set-schedule': {
          const schedule = action.schedule;

          // See if there are custom rules
          const conds = extractScheduleConds(schedule._conditions);
          const condsSet = new Set(Object.values(conds));
          const isCustom = !!(
            schedule._conditions?.find(c => !condsSet.has(c)) ||
            schedule._actions?.find(a => a.op !== 'link-schedule')
          );

          return {
            ...state,
            schedule: action.schedule,
            isCustom,
            fields: {
              payee: schedule._payee ?? null,
              account: schedule._account ?? null,
              amount: schedule._amount || 0,
              amountOp: schedule._amountOp || 'isapprox',
              date: schedule._date ?? null,
              posts_transaction: action.schedule.posts_transaction ?? false,
              name: schedule.name ?? null,
            },
          };
        }
        case 'set-field': {
          if (!(action.field in state.fields)) {
            throw new Error('Unknown field: ' + action.field);
          }

          const fields: { [key: string]: typeof action.value | undefined } = {
            [action.field]: action.value,
          };

          // If we are changing the amount operator either to or
          // away from the `isbetween` operator, the amount value is
          // different and we need to convert it
          if (
            action.field === 'amountOp' &&
            state.fields.amountOp !== action.value
          ) {
            if (action.value === 'isbetween') {
              const num = getScheduledAmount(state.fields.amount);
              fields.amount = { num1: num, num2: num };
            } else if (state.fields.amountOp === 'isbetween') {
              const num = getScheduledAmount(state.fields.amount);
              fields.amount = num;
            }
          }

          return {
            ...state,
            fields: { ...state.fields, ...fields },
          };
        }
        case 'set-repeats': {
          if (!action.repeats) {
            return {
              ...state,
              fields: {
                ...state.fields,
                date: monthUtils.currentDay(),
              },
            };
          }

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
            ...state,
            fields: {
              ...state.fields,
              date,
            },
          };
        }
        case 'set-upcoming-dates':
          return { ...state, upcomingDates: action.dates };
        case 'set-transactions':
          return { ...state, transactions: action.transactions };
        case 'switch-transactions':
          return { ...state, transactionsMode: action.mode };
        case 'form-error':
          return { ...state, error: action.error };
        default:
          return state;
      }
    },
    {
      schedule: null,
      upcomingDates: null,
      error: null,
      fields: {
        payee: null,
        account: null,
        amount: null,
        amountOp: null,
        date: null,
        posts_transaction: false,
        name: null,
      },
      transactions: [],
      transactionsMode: adding ? 'matched' : 'linked',
    },
  );

  async function loadSchedule() {
    const { data } = await aqlQuery(q('schedules').filter({ id }).select('*'));
    return data[0];
  }

  useEffect(() => {
    async function run() {
      setIsLoading(true);
      try {
        if (adding) {
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

          const schedule: Partial<ScheduleEntity> = {
            posts_transaction: false,
            _date: date,
            _conditions: [{ op: 'isapprox', field: 'date', value: date }],
            _actions: [],
          };

          formDispatch({ type: 'set-schedule', schedule });
        } else {
          const schedule = await loadSchedule();

          if (schedule && state.schedule == null) {
            formDispatch({ type: 'set-schedule', schedule });
          } else if (!schedule) {
            // Schedule not found, navigate back
            navigate('/schedules');
          }
        }
      } catch (error) {
        console.error('Failed to load schedule:', error);
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: t('Failed to load schedule. Please try again.'),
            },
          }),
        );
        navigate('/schedules');
      } finally {
        setIsLoading(false);
      }
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function run() {
      const date = state.fields.date;

      if (date === null) {
        formDispatch({ type: 'set-upcoming-dates', dates: null });
        return;
      }

      if (typeof date === 'string') {
        const today = monthUtils.currentDay();
        if (date === today || monthUtils.isAfter(date, today)) {
          formDispatch({ type: 'set-upcoming-dates', dates: [date] });
        } else {
          formDispatch({ type: 'set-upcoming-dates', dates: null });
        }
        return;
      }

      const { data } = await sendCatch('schedule/get-upcoming-dates', {
        config: date,
        count: 3,
      });
      formDispatch({ type: 'set-upcoming-dates', dates: data });
    }
    run();
  }, [state.fields.date]);

  useEffect(() => {
    if (
      state.schedule &&
      state.schedule.id &&
      state.transactionsMode === 'linked'
    ) {
      const live = liveQuery<TransactionEntity>(
        q('transactions')
          .filter({ schedule: state.schedule.id })
          .select('*')
          .options({ splits: 'all' }),
        {
          onData: data =>
            formDispatch({ type: 'set-transactions', transactions: data }),
        },
      );
      return live.unsubscribe;
    }
  }, [state.schedule, state.transactionsMode]);

  useEffect(() => {
    let current = true;
    let unsubscribe: (() => void) | undefined;

    if (state.schedule && state.transactionsMode === 'matched') {
      const updated = updateScheduleConditions(state.schedule, state.fields);

      if ('error' in updated) {
        formDispatch({ type: 'form-error', error: updated.error });
        return;
      }

      // *Extremely* gross hack because the rules are not mapped to
      // public names automatically. We really should be doing that
      // at the database layer
      const conditions = (updated.conditions || []).map(cond => {
        const typedCond = cond as { field: string; op: string; value: unknown };
        if (typedCond.field === 'description') {
          return { ...typedCond, field: 'payee' };
        } else if (typedCond.field === 'acct') {
          return { ...typedCond, field: 'account' };
        }
        return typedCond;
      });

      send('make-filters-from-conditions', {
        conditions,
      }).then(({ filters }) => {
        if (current) {
          const live = liveQuery<TransactionEntity>(
            q('transactions')
              .filter({ $and: filters })
              .select('*')
              .options({ splits: 'all' }),
            {
              onData: data =>
                formDispatch({ type: 'set-transactions', transactions: data }),
            },
          );
          unsubscribe = live.unsubscribe;
        }
      });
    }

    return () => {
      current = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [state.schedule, state.transactionsMode, state.fields]);

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
    const rule = await send('rule-get', { id: ruleId });

    if (!rule) {
      return;
    }

    dispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: async () => {
              const schedule = await loadSchedule();
              formDispatch({ type: 'set-schedule', schedule });
            },
          },
        },
      }),
    );
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
      padding={0}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.mobilePageBackground,
          overflow: 'auto',
        }}
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
          onSave={onSave}
          onCancel={() => navigate(-1)}
        />
      </View>
    </Page>
  );
}
