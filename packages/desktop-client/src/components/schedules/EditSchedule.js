import React, { useEffect, useReducer } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';

import { pushModal } from 'loot-core/src/client/actions/modals';
import { useCachedPayees } from 'loot-core/src/client/data-hooks/payees';
import q, { runQuery, liveQuery } from 'loot-core/src/client/query-helpers';
import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { extractScheduleConds } from 'loot-core/src/shared/schedules';
import AccountAutocomplete from 'loot-design/src/components/AccountAutocomplete';
import { Stack, View, Text, Button } from 'loot-design/src/components/common';
import DateSelect from 'loot-design/src/components/DateSelect';
import {
  FormField,
  FormLabel,
  Checkbox
} from 'loot-design/src/components/forms';
import PayeeAutocomplete from 'loot-design/src/components/PayeeAutocomplete';
import RecurringSchedulePicker from 'loot-design/src/components/RecurringSchedulePicker';
import { SelectedItemsButton } from 'loot-design/src/components/table';
import useSelected, {
  SelectedProvider
} from 'loot-design/src/components/useSelected';
import { colors } from 'loot-design/src/style';

import SimpleTransactionsTable from '../accounts/SimpleTransactionsTable';
import { OpSelect } from '../modals/EditRule';
import { Page } from '../Page';
import { AmountInput, BetweenAmountInput } from '../util/AmountInput';

function mergeFields(defaults, initial) {
  let res = { ...defaults };
  if (initial) {
    // Only merge in fields from `initial` that exist in `defaults`
    Object.keys(initial).forEach(key => {
      if (key in defaults) {
        res[key] = initial[key];
      }
    });
  }
  return res;
}

function updateScheduleConditions(schedule, fields) {
  let conds = extractScheduleConds(schedule._conditions);

  let updateCond = (cond, op, field, value) => {
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
        value: fields.amount
      }
    ].filter(Boolean)
  };
}

export default function ScheduleDetails() {
  let { id, initialFields } = useParams();
  let adding = id == null;
  let payees = useCachedPayees({ idKey: true });
  let history = useHistory();
  let globalDispatch = useDispatch();
  let dateFormat = useSelector(state => {
    return state.prefs.local.dateFormat || 'MM/dd/yyyy';
  });

  let [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'set-schedule': {
          let schedule = action.schedule;

          // See if there are custom rules
          let conds = extractScheduleConds(schedule._conditions);
          let condsSet = new Set(Object.values(conds));
          let isCustom =
            schedule._conditions.find(c => !condsSet.has(c)) ||
            schedule._actions.find(a => a.op !== 'link-schedule');

          return {
            ...state,
            schedule: action.schedule,
            isCustom,
            fields: {
              payee: schedule._payee,
              account: schedule._account,
              amount: schedule._amount || 0,
              amountOp: schedule._amountOp || 'isapprox',
              date: schedule._date,
              posts_transaction: action.schedule.posts_transaction
            }
          };
        }
        case 'set-field':
          if (!(action.field in state.fields)) {
            throw new Error('Unknown field: ' + action.field);
          }

          let fields = { [action.field]: action.value };

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
            fields: { ...state.fields, ...fields }
          };
        case 'set-transactions':
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
                    patterns: []
                  }
                : monthUtils.currentDay()
            }
          };
        case 'set-upcoming-dates':
          return {
            ...state,
            upcomingDates: action.dates
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
      fields: mergeFields(
        {
          payee: null,
          account: null,
          amount: null,
          amountOp: null,
          date: null,
          posts_transaction: false
        },
        initialFields
      ),
      transactions: [],
      transactionsMode: adding ? 'matched' : 'linked'
    }
  );

  async function loadSchedule() {
    let { data } = await runQuery(q('schedules').filter({ id }).select('*'));
    return data[0];
  }

  useEffect(() => {
    async function run() {
      if (adding) {
        let date = {
          start: monthUtils.currentDay(),
          frequency: 'monthly',
          patterns: []
        };
        let schedule = {
          posts_transaction: false,
          _date: date,
          _conditions: [{ op: 'isapprox', field: 'date', value: date }],
          _actions: []
        };

        dispatch({ type: 'set-schedule', schedule });
      } else {
        let schedule = await loadSchedule();

        if (schedule && state.schedule == null) {
          dispatch({ type: 'set-schedule', schedule });
        }
      }
    }
    run();
  }, []);

  useEffect(() => {
    async function run() {
      let date = state.fields.date;

      if (date == null) {
        dispatch({ type: 'set-upcoming-dates', dates: null });
      } else {
        if (date.frequency) {
          let { data } = await sendCatch('schedule/get-upcoming-dates', {
            config: date,
            count: 3
          });
          dispatch({ type: 'set-upcoming-dates', dates: data });
        } else {
          let today = monthUtils.currentDay();
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
      let live = liveQuery(
        q('transactions')
          .filter({ schedule: state.schedule.id })
          .select('*')
          .options({ splits: 'none' }),
        data => dispatch({ type: 'set-transactions', transactions: data })
      );
      return live.unsubscribe;
    }
  }, [state.schedule, state.transactionsMode]);

  useEffect(() => {
    let current = true;
    let unsubscribe;

    if (state.schedule && state.transactionsMode === 'matched') {
      let { conditions } = updateScheduleConditions(
        state.schedule,
        state.fields
      );

      dispatch({ type: 'set-transactions', transactions: [] });

      // *Extremely* gross hack because the rules are not mapped to
      // public names automatically. We really should be doing that
      // at the database layer
      conditions = conditions.map(cond => {
        if (cond.field === 'description') {
          return { ...cond, field: 'payee' };
        } else if (cond.field === 'acct') {
          return { ...cond, field: 'account' };
        }
        return cond;
      });

      send('make-filters-from-conditions', {
        conditions: conditions
      }).then(({ filters }) => {
        if (current) {
          let live = liveQuery(
            q('transactions')
              .filter({ $and: filters })
              .select('*')
              .options({ splits: 'none' }),
            data => dispatch({ type: 'set-transactions', transactions: data })
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

  let selectedInst = useSelected('transactions', state.transactions, []);

  async function onSave() {
    dispatch({ type: 'form-error', error: null });

    let { error, conditions } = updateScheduleConditions(
      state.schedule,
      state.fields
    );

    if (error) {
      dispatch({ type: 'form-error', error });
      return;
    }

    let res = await sendCatch(adding ? 'schedule/create' : 'schedule/update', {
      schedule: {
        id: state.schedule.id,
        posts_transaction: state.fields.posts_transaction
      },
      conditions
    });

    if (res.error) {
      dispatch({
        type: 'form-error',
        error:
          'An error occurred while saving. Please contact help@actualbudget.com for support.'
      });
    } else {
      if (adding) {
        await onLinkTransactions([...selectedInst.items], res.data);
      }
      history.goBack();
    }
  }

  async function onEditRule(ruleId) {
    let rule = await send('rule-get', { id: ruleId || state.schedule.rule });

    globalDispatch(
      pushModal('edit-rule', {
        rule,
        onSave: async () => {
          let schedule = await loadSchedule();
          dispatch({ type: 'set-schedule', schedule });
        }
      })
    );
  }

  async function onLinkTransactions(ids, scheduleId) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({
        id,
        schedule: scheduleId || state.schedule.id
      }))
    });
    selectedInst.dispatch({ type: 'select-none' });
  }

  async function onUnlinkTransactions(ids) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({ id, schedule: null }))
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

  let payee = payees ? payees[state.fields.payee] : null;

  // This is derived from the date
  let repeats = state.fields.date ? !!state.fields.date.frequency : false;

  return (
    <Page
      title={payee ? `Schedule: ${payee.name}` : 'Schedule'}
      modalSize="medium"
    >
      <Stack direction="row" style={{ marginTop: 20 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Payee" />
          <PayeeAutocomplete
            value={state.fields.payee}
            inputProps={{ placeholder: '(none)' }}
            onSelect={id =>
              dispatch({ type: 'set-field', field: 'payee', value: id })
            }
          />
        </FormField>

        <FormField style={{ flex: 1 }}>
          <FormLabel title="Account" />
          <AccountAutocomplete
            includeClosedAccounts={false}
            value={state.fields.account}
            inputProps={{ placeholder: '(none)' }}
            onSelect={id =>
              dispatch({ type: 'set-field', field: 'account', value: id })
            }
          />
        </FormField>

        <FormField style={{ flex: 1 }}>
          <Stack direction="row" align="center" style={{ marginBottom: 3 }}>
            <FormLabel title="Amount" style={{ margin: 0, flex: 1 }} />
            <OpSelect
              ops={['is', 'isapprox', 'isbetween']}
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
                color: colors.n5,
                fontSize: 12
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
                  value
                })
              }
            />
          ) : (
            <AmountInput
              defaultValue={state.fields.amount}
              onChange={value =>
                dispatch({
                  type: 'set-field',
                  field: 'amount',
                  value
                })
              }
            />
          )}
        </FormField>
      </Stack>

      <View style={{ marginTop: 20 }}>
        <FormLabel title="Date" />
      </View>

      <Stack direction="row" align="flex-start">
        <View style={{ flex: 1 }}>
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
              <Text style={{ color: colors.n4, fontWeight: 600 }}>
                Upcoming dates
              </Text>
              <Stack
                direction="column"
                spacing={1}
                style={{ marginTop: 10, color: colors.n4 }}
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
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            userSelect: 'none'
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

        <View
          style={{
            alignItems: 'flex-end',
            flex: 1
          }}
        >
          <View
            style={{
              marginTop: 5,
              flexDirection: 'row',
              alignItems: 'center',
              userSelect: 'none',
              justifyContent: 'flex-end'
            }}
          >
            <Checkbox
              id="form_posts_transaction"
              checked={state.fields.posts_transaction}
              onChange={e => {
                dispatch({
                  type: 'set-field',
                  field: 'posts_transaction',
                  value: e.target.checked
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
              color: colors.n4,
              marginTop: 10,
              fontSize: 13,
              lineHeight: '1.4em'
            }}
          >
            If checked, the schedule will automatically create transactions for
            you in the specified account
          </Text>

          {!adding && state.schedule.rule && (
            <Stack direction="row" align="center" style={{ marginTop: 30 }}>
              {state.isCustom && (
                <Text
                  style={{
                    color: colors.b5,
                    fontSize: 13,
                    textAlign: 'right',
                    width: 350
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
        </View>
      </Stack>

      <View style={{ marginTop: 30, flex: 1 }}>
        <SelectedProvider instance={selectedInst}>
          {adding ? (
            <View style={{ flexDirection: 'row', padding: '5px 0' }}>
              <Text style={{ color: colors.n4 }}>
                These transactions match this schedule:
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ color: colors.n6 }}>
                Select transactions to link on save
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button
                bare
                style={{
                  color:
                    state.transactionsMode === 'linked' ? colors.b4 : colors.n7,
                  marginRight: 10,
                  fontSize: 14
                }}
                onClick={() => onSwitchTransactions('linked')}
              >
                Linked transactions
              </Button>{' '}
              <Button
                bare
                style={{
                  color:
                    state.transactionsMode === 'matched'
                      ? colors.b4
                      : colors.n7,
                  fontSize: 14
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
            transactions={state.transactions}
            fields={['date', 'payee', 'amount']}
            style={{
              border: '1px solid ' + colors.border,
              borderRadius: 4,
              overflow: 'hidden',
              marginTop: 5
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
        {state.error && <Text style={{ color: colors.r4 }}>{state.error}</Text>}
        <Button style={{ marginRight: 10 }} onClick={() => history.goBack()}>
          Cancel
        </Button>
        <Button primary onClick={onSave}>
          {adding ? 'Add' : 'Save'}
        </Button>
      </Stack>
    </Page>
  );
}
