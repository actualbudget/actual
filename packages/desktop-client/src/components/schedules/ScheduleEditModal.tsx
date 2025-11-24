// @ts-strict-ignore
import React, { useEffect, useReducer } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SpaceBetween } from '@actual-app/components/space-between';
import { t } from 'i18next';

import { send, sendCatch } from 'loot-core/platform/client/fetch';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import { extractScheduleConds } from 'loot-core/shared/schedules';
import {
  type TransactionEntity,
  type ScheduleEntity,
  type RuleConditionOp,
  type RecurConfig,
} from 'loot-core/types/models';

import { ScheduleEditForm, type ScheduleFormFields } from './ScheduleEditForm';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useSelected } from '@desktop-client/hooks/useSelected';
import {
  type Modal as ModalType,
  pushModal,
} from '@desktop-client/modals/modalsSlice';
import { getPayeesById } from '@desktop-client/payees/payeesSlice';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import { liveQuery } from '@desktop-client/queries/liveQuery';
import { useDispatch } from '@desktop-client/redux';

type Fields = ScheduleFormFields;

function updateScheduleConditions(
  schedule: Partial<ScheduleEntity>,
  fields: Fields,
) {
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
    return { error: t('Date is required') };
  }

  if (fields.amount == null) {
    return { error: t('A valid amount is required') };
  }

  return {
    conditions: [
      updateCond(conds.payee, 'is', 'payee', fields.payee),
      updateCond(conds.account, 'is', 'account', fields.account),
      updateCond(conds.date, 'isapprox', 'date', fields.date),
      // We don't use `updateCond` for amount because we want to
      // overwrite it completely
      {
        op: fields.amountOp,
        field: 'amount',
        value: fields.amount,
      },
    ].filter(val => !!val),
  };
}

type ScheduleEditModalProps = Extract<
  ModalType,
  { name: 'schedule-edit' }
>['options'];

export function ScheduleEditModal({ id, transaction }: ScheduleEditModalProps) {
  const { t } = useTranslation();

  const adding = id == null;
  const fromTrans = transaction != null;
  const payees = getPayeesById(usePayees());
  const globalDispatch = useDispatch();

  const [state, dispatch] = useReducer(
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
            action.value !== state.fields.amountOp
          ) {
            if (action.value === 'isbetween') {
              // We need a range if switching to `isbetween`. The
              // amount field should be a number since we are
              // switching away from the other ops, but check just in
              // case
              fields.amount =
                typeof state.fields.amount === 'number'
                  ? { num1: state.fields.amount, num2: state.fields.amount }
                  : { num1: 0, num2: 0 };
            } else if (state.fields.amountOp === 'isbetween') {
              // We need just a number if switching away from
              // `isbetween`. The amount field should be a range, but
              // also check just in case. We grab just the first
              // number and use it
              fields.amount =
                typeof state.fields.amount === 'number'
                  ? state.fields.amount
                  : state.fields.amount?.num1;
            }
          }

          return {
            ...state,
            fields: { ...state.fields, ...fields },
          };
        }

        case 'set-transactions': {
          if (fromTrans && action.transactions) {
            action.transactions.sort(a => {
              return transaction.id === a.id ? -1 : 1;
            });
          }
          return { ...state, transactions: action.transactions };
        }

        case 'set-repeats': {
          return {
            ...state,
            fields: {
              ...state.fields,
              date: action.repeats
                ? ({
                    frequency: 'monthly',
                    endMode: 'never',
                    start: monthUtils.currentDay(),
                    patterns: [],
                  } satisfies RecurConfig)
                : monthUtils.currentDay(),
            },
          };
        }

        case 'set-upcoming-dates': {
          return {
            ...state,
            upcomingDates: action.dates,
          };
        }

        case 'form-error': {
          return { ...state, error: action.error };
        }

        case 'switch-transactions': {
          return { ...state, transactionsMode: action.mode };
        }

        default: {
          throw new Error('Unknown action');
        }
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

        const schedule: Partial<ScheduleEntity> = fromTrans
          ? {
              posts_transaction: false,
              _conditions: [{ op: 'isapprox', field: 'date', value: date }],
              _actions: [],
              _account: transaction.account,
              _amount: transaction.amount,
              _amountOp: 'is',
              name: transaction.payee ? payees[transaction.payee].name : '',
              _payee: transaction.payee ? transaction.payee : '',
              _date: {
                ...date,
                frequency: 'monthly',
                start: transaction.date,
                patterns: [],
              },
            }
          : {
              posts_transaction: false,
              _date: date,
              _conditions: [{ op: 'isapprox', field: 'date', value: date }],
              _actions: [],
            };

        dispatch({ type: 'set-schedule', schedule });
      } else {
        const schedule = await loadSchedule();

        if (schedule && state.schedule == null) {
          dispatch({ type: 'set-schedule', schedule });
        }
      }
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function run() {
      const date = state.fields.date;

      if (date === null) {
        dispatch({ type: 'set-upcoming-dates', dates: null });
        return;
      }

      if (typeof date === 'string') {
        const today = monthUtils.currentDay();
        if (date === today || monthUtils.isAfter(date, today)) {
          dispatch({ type: 'set-upcoming-dates', dates: [date] });
        } else {
          dispatch({ type: 'set-upcoming-dates', dates: null });
        }
        return;
      }

      const { data } = await sendCatch('schedule/get-upcoming-dates', {
        config: date,
        count: 3,
      });
      dispatch({ type: 'set-upcoming-dates', dates: data });
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
            dispatch({ type: 'set-transactions', transactions: data }),
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
        dispatch({ type: 'form-error', error: updated.error });
        return;
      }

      // *Extremely* gross hack because the rules are not mapped to
      // public names automatically. We really should be doing that
      // at the database layer
      const conditions = updated.conditions.map(cond => {
        if (cond.field === 'description') {
          return { ...cond, field: 'payee' };
        } else if (cond.field === 'acct') {
          return { ...cond, field: 'account' };
        }
        return cond;
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
                dispatch({ type: 'set-transactions', transactions: data }),
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

  const selectedInst = useSelected(
    'transactions',
    state.transactions,
    transaction ? [transaction.id] : [],
  );

  async function onSave(close: () => void) {
    dispatch({ type: 'form-error', error: null });
    if (!state.schedule) {
      return;
    }

    if (state.fields.name) {
      const { data: sameName } = await aqlQuery(
        q('schedules').filter({ name: state.fields.name }).select('id'),
      );
      if (sameName.length > 0 && sameName[0].id !== state.schedule.id) {
        dispatch({
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
      dispatch({ type: 'form-error', error });
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
      dispatch({
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

    close();
  }

  async function onEditRule(id: string) {
    const rule = await send('rule-get', { id });

    if (!rule) {
      return;
    }

    globalDispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: async () => {
              const schedule = await loadSchedule();
              dispatch({ type: 'set-schedule', schedule });
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

  if (schedule == null) {
    return null;
  }

  function onSwitchTransactions(mode: 'linked' | 'matched') {
    dispatch({ type: 'switch-transactions', mode });
    selectedInst.dispatch({ type: 'select-none' });
  }

  const payee =
    payees && state.fields.payee ? payees[state.fields.payee] : null;
  // This is derived from the date
  const repeats =
    state.fields.date && typeof state.fields.date !== 'string'
      ? !!state.fields.date.frequency
      : false;
  return (
    <Modal name="schedule-edit">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              payee
                ? t(`Schedule: {{name}}`, { name: payee.name })
                : t('Schedule')
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <ScheduleEditForm
            fields={state.fields}
            dispatch={dispatch}
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

          <SpaceBetween
            style={{
              marginTop: 20,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <Button onPress={close}>
              <Trans>Cancel</Trans>
            </Button>
            <Button variant="primary" onPress={() => onSave(close)}>
              {adding ? t('Add') : t('Save')}
            </Button>
          </SpaceBetween>
        </>
      )}
    </Modal>
  );
}
