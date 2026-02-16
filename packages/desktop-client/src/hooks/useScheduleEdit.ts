// @ts-strict-ignore
import { useEffect, useEffectEvent, useReducer, useState } from 'react';

import { send, sendCatch } from 'loot-core/platform/client/connection';
import * as monthUtils from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  extractScheduleConds,
  getScheduledAmount,
} from 'loot-core/shared/schedules';
import type {
  RecurConfig,
  ScheduleEntity,
  TransactionEntity,
} from 'loot-core/types/models';

import { updateScheduleConditions } from '@desktop-client/components/schedules/schedule-edit-utils';
import type { ScheduleFormFields } from '@desktop-client/components/schedules/ScheduleEditForm';
import { aqlQuery } from '@desktop-client/queries/aqlQuery';
import { liveQuery } from '@desktop-client/queries/liveQuery';

export type ScheduleEditState = {
  isCustom?: boolean;
  schedule: null | Partial<ScheduleEntity>;
  upcomingDates: null | string[];
  error: null | string;
  fields: ScheduleFormFields;
  transactions: TransactionEntity[];
  transactionsMode: 'matched' | 'linked';
};

type ScheduleEditAction =
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
      transactionId?: string;
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
    };

function createScheduleEditReducer(useGetScheduledAmount: boolean = false) {
  return (
    state: ScheduleEditState,
    action: ScheduleEditAction,
  ): ScheduleEditState => {
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
            // We need a range if switching to `isbetween`
            if (useGetScheduledAmount) {
              const num = getScheduledAmount(state.fields.amount);
              fields.amount = { num1: num, num2: num };
            } else {
              fields.amount =
                typeof state.fields.amount === 'number'
                  ? { num1: state.fields.amount, num2: state.fields.amount }
                  : { num1: 0, num2: 0 };
            }
          } else if (state.fields.amountOp === 'isbetween') {
            // We need just a number if switching away from `isbetween`
            if (useGetScheduledAmount) {
              const num = getScheduledAmount(state.fields.amount);
              fields.amount = num;
            } else {
              fields.amount =
                typeof state.fields.amount === 'number'
                  ? state.fields.amount
                  : state.fields.amount?.num1;
            }
          }
        }

        return {
          ...state,
          fields: { ...state.fields, ...fields },
        };
      }

      case 'set-transactions': {
        const transactions = action.transactions;
        // Sort transactions if we have a transactionId to prioritize
        if (action.transactionId && transactions) {
          transactions.sort(a => {
            return action.transactionId === a.id ? -1 : 1;
          });
        }
        return { ...state, transactions };
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
  };
}

type UseScheduleEditOptions = {
  scheduleId: string | null | undefined;
  adding: boolean;
  initialSchedule?: Partial<ScheduleEntity>;
  transactionId?: string;
  useGetScheduledAmount?: boolean;
};

export function useScheduleEdit({
  scheduleId,
  adding,
  initialSchedule,
  transactionId,
  useGetScheduledAmount = false,
}: UseScheduleEditOptions) {
  const reducer = createScheduleEditReducer(useGetScheduledAmount);

  const [isLoading, setIsLoading] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
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
  });

  async function loadSchedule() {
    if (!scheduleId) {
      return null;
    }

    setIsLoading(true);
    const { data } = await aqlQuery(
      q('schedules').filter({ id: scheduleId }).select('*'),
    );
    setIsLoading(false);

    return data[0];
  }

  const setSchedule = useEffectEvent(async () => {
    if (adding) {
      if (initialSchedule) {
        dispatch({ type: 'set-schedule', schedule: initialSchedule });
      }
      return;
    }

    const schedule = await loadSchedule();
    if (schedule && state.schedule == null) {
      dispatch({ type: 'set-schedule', schedule });
    }
  });

  // Load schedule on mount
  useEffect(() => {
    setSchedule();
  }, []);

  // Update upcoming dates when date changes
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

  // Load linked transactions
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
            dispatch({
              type: 'set-transactions',
              transactions: data,
              transactionId,
            }),
        },
      );
      return live.unsubscribe;
    }
  }, [state.schedule, state.transactionsMode, transactionId]);

  // Load matched transactions
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
                dispatch({
                  type: 'set-transactions',
                  transactions: data,
                  transactionId,
                }),
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
  }, [state.schedule, state.transactionsMode, state.fields, transactionId]);

  return {
    state,
    dispatch,
    loadSchedule,
    isLoading,
  };
}
