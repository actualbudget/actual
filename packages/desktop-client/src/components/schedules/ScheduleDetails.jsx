import React, { useEffect, useReducer } from 'react';
import { useDispatch } from 'react-redux';

import { getPayeesById } from 'loot-core/client/reducers/queries';
import { pushModal } from 'loot-core/src/client/actions/modals';
import { runQuery, liveQuery } from 'loot-core/src/client/query-helpers';
import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import { extractScheduleConds } from 'loot-core/src/shared/schedules';

import { useDateFormat } from '../../hooks/useDateFormat';
import { usePayees } from '../../hooks/usePayees';
import { useSelected, SelectedProvider } from '../../hooks/useSelected';
import { theme } from '../../style';
import { AccountAutocomplete } from '../autocomplete/AccountAutocomplete';
import { PayeeAutocomplete } from '../autocomplete/PayeeAutocomplete';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FormField, FormLabel, Checkbox } from '../forms';
import { OpSelect } from '../modals/EditRule';
import { DateSelect } from '../select/DateSelect';
import { RecurringSchedulePicker } from '../select/RecurringSchedulePicker';
import { SelectedItemsButton } from '../table';
import { SimpleTransactionsTable } from '../transactions/SimpleTransactionsTable';
import { AmountInput, BetweenAmountInput } from '../util/AmountInput';
import { GenericInput } from '../util/GenericInput';

function updateScheduleConditions(schedule, fields) {
  const conds = extractScheduleConds(schedule._conditions);

  const updateCond = (cond, op, field, value) => {
    if (cond) {
      return { ...cond, value };
    }

    if (value != null) {
      return { op, field, value };
    }

    return null;
  };

  // Validate
  if (fields.date == null) {
    return { error: 'Date is required' };
  }

  if (fields.amount == null) {
    return { error: 'A valid amount is required' };
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
    ].filter(Boolean),
  };
}

export function ScheduleDetails({ modalProps, actions, id, transaction }) {
  const adding = id == null;
  const fromTrans = transaction != null;
  const payees = getPayeesById(usePayees());
  const globalDispatch = useDispatch();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'set-schedule': {
          const schedule = action.schedule;

          // See if there are custom rules
          const conds = extractScheduleConds(schedule._conditions);
          const condsSet = new Set(Object.values(conds));
          const isCustom =
            schedule._conditions.find(c => !condsSet.has(c)) ||
            schedule._actions.find(a => a.op !== 'link-schedule');

          return {
            ...state,
            schedule: action.schedule,
            isCustom,
            fields: {
              payee: schedule._payee,
              account: schedule._account,
              // defalut to a non-zero value so the sign can be changed before the value
              amount: schedule._amount || -1000,
              amountOp: schedule._amountOp || 'isapprox',
              date: schedule._date,
              posts_transaction: action.schedule.posts_transaction,
              name: schedule.name,
            },
          };
        }
        case 'set-field':
          if (!(action.field in state.fields)) {
            throw new Error('Unknown field: ' + action.field);
          }

          const fields = { [action.field]: action.value };

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
                  : state.fields.amount.num1;
            }
          }

          return {
            ...state,
            fields: { ...state.fields, ...fields },
          };
        case 'set-transactions':
          if (fromTrans && action.transactions) {
            action.transactions.sort(a => {
              return transaction.id === a.id ? -1 : 1;
            });
          }
          return { ...state, transactions: action.transactions };
        case 'set-repeats':
          return {
            ...state,
            fields: {
              ...state.fields,
              date: action.repeats
                ? {
                    frequency: 'monthly',
                    start: monthUtils.currentDay(),
                    patterns: [],
                  }
                : monthUtils.currentDay(),
            },
          };
        case 'set-upcoming-dates':
          return {
            ...state,
            upcomingDates: action.dates,
          };

        case 'form-error':
          return { ...state, error: action.error };

        case 'switch-transactions':
          return { ...state, transactionsMode: action.mode };

        default:
          throw new Error('Unknown action: ' + action.type);
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
    const { data } = await runQuery(q('schedules').filter({ id }).select('*'));
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
          endOccurrences: '1',
          endDate: monthUtils.currentDay(),
        };

        const schedule = fromTrans
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
  }, []);

  useEffect(() => {
    async function run() {
      const date = state.fields.date;

      if (date == null) {
        dispatch({ type: 'set-upcoming-dates', dates: null });
      } else {
        if (date.frequency) {
          const { data } = await sendCatch('schedule/get-upcoming-dates', {
            config: date,
            count: 3,
          });
          dispatch({ type: 'set-upcoming-dates', dates: data });
        } else {
          const today = monthUtils.currentDay();
          if (date === today || monthUtils.isAfter(date, today)) {
            dispatch({ type: 'set-upcoming-dates', dates: [date] });
          } else {
            dispatch({ type: 'set-upcoming-dates', dates: null });
          }
        }
      }
    }
    run();
  }, [state.fields.date]);

  useEffect(() => {
    if (
      state.schedule &&
      state.schedule.id &&
      state.transactionsMode === 'linked'
    ) {
      const live = liveQuery(
        q('transactions')
          .filter({ schedule: state.schedule.id })
          .select('*')
          .options({ splits: 'all' }),
        data => dispatch({ type: 'set-transactions', transactions: data }),
      );
      return live.unsubscribe;
    }
  }, [state.schedule, state.transactionsMode]);

  useEffect(() => {
    let current = true;
    let unsubscribe;

    if (state.schedule && state.transactionsMode === 'matched') {
      const { error, conditions: originalConditions } =
        updateScheduleConditions(state.schedule, state.fields);

      if (error) {
        dispatch({ type: 'form-error', error });
        return;
      }

      // *Extremely* gross hack because the rules are not mapped to
      // public names automatically. We really should be doing that
      // at the database layer
      const conditions = originalConditions.map(cond => {
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
          const live = liveQuery(
            q('transactions')
              .filter({ $and: filters })
              .select('*')
              .options({ splits: 'all' }),
            data => dispatch({ type: 'set-transactions', transactions: data }),
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

  async function onSave() {
    dispatch({ type: 'form-error', error: null });
    if (state.fields.name) {
      const { data: sameName } = await runQuery(
        q('schedules').filter({ name: state.fields.name }).select('id'),
      );
      if (sameName.length > 0 && sameName[0].id !== state.schedule.id) {
        dispatch({
          type: 'form-error',
          error: 'There is already a schedule with this name',
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
        error:
          'An error occurred while saving. Please visit https://actualbudget.org/contact/ for support.',
      });
    } else {
      if (adding) {
        await onLinkTransactions([...selectedInst.items], res.data);
      }
      actions.popModal();
    }
  }

  async function onEditRule(ruleId) {
    const rule = await send('rule-get', { id: ruleId || state.schedule.rule });

    globalDispatch(
      pushModal('edit-rule', {
        rule,
        onSave: async () => {
          const schedule = await loadSchedule();
          dispatch({ type: 'set-schedule', schedule });
        },
      }),
    );
  }

  async function onLinkTransactions(ids, scheduleId) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({
        id,
        schedule: scheduleId || state.schedule.id,
      })),
    });
    selectedInst.dispatch({ type: 'select-none' });
  }

  async function onUnlinkTransactions(ids) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({ id, schedule: null })),
    });
    selectedInst.dispatch({ type: 'select-none' });
  }

  if (state.schedule == null) {
    return null;
  }

  function onSwitchTransactions(mode) {
    dispatch({ type: 'switch-transactions', mode });
    selectedInst.dispatch({ type: 'select-none' });
  }

  const payee = payees ? payees[state.fields.payee] : null;
  // This is derived from the date
  const repeats = state.fields.date ? !!state.fields.date.frequency : false;
  return (
    <Modal
      title={payee ? `Schedule: ${payee.name}` : 'Schedule'}
      size="medium"
      {...modalProps}
    >
      <Stack direction="row" style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Schedule Name" htmlFor="name-field" />
          <GenericInput
            field="string"
            type="string"
            value={state.fields.name}
            multi={false}
            onChange={e => {
              dispatch({ type: 'set-field', field: 'name', value: e });
            }}
          />
        </FormField>
      </Stack>
      <Stack direction="row" style={{ marginTop: 20 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Payee" id="payee-label" htmlFor="payee-field" />
          <PayeeAutocomplete
            value={state.fields.payee}
            labelProps={{ id: 'payee-label' }}
            inputProps={{ id: 'payee-field', placeholder: '(none)' }}
            onSelect={id =>
              dispatch({ type: 'set-field', field: 'payee', value: id })
            }
          />
        </FormField>

        <FormField style={{ flex: 1 }}>
          <FormLabel
            title="Account"
            id="account-label"
            htmlFor="account-field"
          />
          <AccountAutocomplete
            includeClosedAccounts={false}
            value={state.fields.account}
            labelProps={{ id: 'account-label' }}
            inputProps={{ id: 'account-field', placeholder: '(none)' }}
            onSelect={id =>
              dispatch({ type: 'set-field', field: 'account', value: id })
            }
          />
        </FormField>

        <FormField style={{ flex: 1 }}>
          <Stack direction="row" align="center" style={{ marginBottom: 3 }}>
            <FormLabel
              title="Amount"
              htmlFor="amount-field"
              style={{ margin: 0, flex: 1 }}
            />
            <OpSelect
              ops={['isapprox', 'is', 'isbetween']}
              value={state.fields.amountOp}
              formatOp={op => {
                switch (op) {
                  case 'is':
                    return 'is exactly';
                  case 'isapprox':
                    return 'is approximately';
                  case 'isbetween':
                    return 'is between';
                  default:
                    throw new Error('Invalid op for select: ' + op);
                }
              }}
              style={{
                padding: '0 10px',
                color: theme.pageTextLight,
                fontSize: 12,
              }}
              onChange={(_, op) =>
                dispatch({ type: 'set-field', field: 'amountOp', value: op })
              }
            />
          </Stack>
          {state.fields.amountOp === 'isbetween' ? (
            <BetweenAmountInput
              defaultValue={state.fields.amount}
              onChange={value =>
                dispatch({
                  type: 'set-field',
                  field: 'amount',
                  value,
                })
              }
            />
          ) : (
            <AmountInput
              id="amount-field"
              value={state.fields.amount}
              onUpdate={value =>
                dispatch({
                  type: 'set-field',
                  field: 'amount',
                  value,
                })
              }
            />
          )}
        </FormField>
      </Stack>

      <View style={{ marginTop: 20 }}>
        <FormLabel title="Date" />
      </View>

      <Stack direction="row" align="flex-start" justify="space-between">
        <View style={{ width: '13.44rem' }}>
          {repeats ? (
            <RecurringSchedulePicker
              value={state.fields.date}
              onChange={value =>
                dispatch({ type: 'set-field', field: 'date', value })
              }
            />
          ) : (
            <DateSelect
              value={state.fields.date}
              onSelect={date =>
                dispatch({ type: 'set-field', field: 'date', value: date })
              }
              dateFormat={dateFormat}
            />
          )}

          {state.upcomingDates && (
            <View style={{ fontSize: 13, marginTop: 20 }}>
              <Text style={{ color: theme.pageTextLight, fontWeight: 600 }}>
                Upcoming dates
              </Text>
              <Stack
                direction="column"
                spacing={1}
                style={{ marginTop: 10, color: theme.pageTextLight }}
              >
                {state.upcomingDates.map(date => (
                  <View key={date}>
                    {monthUtils.format(date, `${dateFormat} EEEE`)}
                  </View>
                ))}
              </Stack>
            </View>
          )}
        </View>

        <View
          style={{
            marginTop: 5,
            flexDirection: 'row',
            alignItems: 'center',
            userSelect: 'none',
          }}
        >
          <Checkbox
            id="form_repeats"
            checked={repeats}
            onChange={e => {
              dispatch({ type: 'set-repeats', repeats: e.target.checked });
            }}
          />
          <label htmlFor="form_repeats" style={{ userSelect: 'none' }}>
            Repeats
          </label>
        </View>

        <Stack align="flex-end">
          <View
            style={{
              marginTop: 5,
              flexDirection: 'row',
              alignItems: 'center',
              userSelect: 'none',
              justifyContent: 'flex-end',
            }}
          >
            <Checkbox
              id="form_posts_transaction"
              checked={state.fields.posts_transaction}
              onChange={e => {
                dispatch({
                  type: 'set-field',
                  field: 'posts_transaction',
                  value: e.target.checked,
                });
              }}
            />
            <label
              htmlFor="form_posts_transaction"
              style={{ userSelect: 'none' }}
            >
              Automatically add transaction
            </label>
          </View>

          <Text
            style={{
              width: 350,
              textAlign: 'right',
              color: theme.pageTextLight,
              marginTop: 10,
              fontSize: 13,
              lineHeight: '1.4em',
            }}
          >
            If checked, the schedule will automatically create transactions for
            you in the specified account
          </Text>

          {!adding && state.schedule.rule && (
            <Stack direction="row" align="center" style={{ marginTop: 20 }}>
              {state.isCustom && (
                <Text
                  style={{
                    color: theme.pageTextLight,
                    fontSize: 13,
                    textAlign: 'right',
                    width: 350,
                  }}
                >
                  This schedule has custom conditions and actions
                </Text>
              )}
              <Button onClick={() => onEditRule()} disabled={adding}>
                Edit as rule
              </Button>
            </Stack>
          )}
        </Stack>
      </Stack>

      <View style={{ marginTop: 30, flex: 1 }}>
        <SelectedProvider instance={selectedInst}>
          {adding ? (
            <View style={{ flexDirection: 'row', padding: '5px 0' }}>
              <Text style={{ color: theme.pageTextLight }}>
                These transactions match this schedule:
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ color: theme.pageTextLight }}>
                Select transactions to link on save
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button
                type="bare"
                style={{
                  color:
                    state.transactionsMode === 'linked'
                      ? theme.pageTextLink
                      : theme.pageTextSubdued,
                  marginRight: 10,
                  fontSize: 14,
                }}
                onClick={() => onSwitchTransactions('linked')}
              >
                Linked transactions
              </Button>{' '}
              <Button
                type="bare"
                style={{
                  color:
                    state.transactionsMode === 'matched'
                      ? theme.pageTextLink
                      : theme.pageTextSubdued,
                  fontSize: 14,
                }}
                onClick={() => onSwitchTransactions('matched')}
              >
                Find matching transactions
              </Button>
              <View style={{ flex: 1 }} />
              <SelectedItemsButton
                name="transactions"
                items={
                  state.transactionsMode === 'linked'
                    ? [{ name: 'unlink', text: 'Unlink from schedule' }]
                    : [{ name: 'link', text: 'Link to schedule' }]
                }
                onSelect={(name, ids) => {
                  switch (name) {
                    case 'link':
                      onLinkTransactions(ids);
                      break;
                    case 'unlink':
                      onUnlinkTransactions(ids);
                      break;
                    default:
                  }
                }}
              />
            </View>
          )}

          <SimpleTransactionsTable
            renderEmpty={
              <NoTransactionsMessage
                error={state.error}
                transactionsMode={state.transactionsMode}
              />
            }
            transactions={state.transactions}
            fields={['date', 'payee', 'amount']}
            style={{
              border: '1px solid ' + theme.tableBorder,
              borderRadius: 4,
              overflow: 'hidden',
              marginTop: 5,
              maxHeight: 200,
            }}
          />
        </SelectedProvider>
      </View>

      <Stack
        direction="row"
        justify="flex-end"
        align="center"
        style={{ marginTop: 20 }}
      >
        {state.error && (
          <Text style={{ color: theme.errorText }}>{state.error}</Text>
        )}
        <Button style={{ marginRight: 10 }} onClick={actions.popModal}>
          Cancel
        </Button>
        <Button type="primary" onClick={onSave}>
          {adding ? 'Add' : 'Save'}
        </Button>
      </Stack>
    </Modal>
  );
}

function NoTransactionsMessage(props) {
  return (
    <View
      style={{
        padding: 20,
        color: theme.pageTextLight,
        textAlign: 'center',
      }}
    >
      {props.error ? (
        <Text style={{ color: theme.errorText }}>
          Could not search: {props.error}
        </Text>
      ) : props.transactionsMode === 'matched' ? (
        'No matching transactions'
      ) : (
        'No linked transactions'
      )}
    </View>
  );
}
