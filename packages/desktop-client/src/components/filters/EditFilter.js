import React, { useEffect, useRef, useReducer } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';

import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import q, { liveQuery, runQuery } from 'loot-core/src/client/query-helpers';
import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import { unparse } from 'loot-core/src/shared/rules';

import useSelected, { SelectedProvider } from '../../hooks/useSelected';
import { colors } from '../../style';
import SimpleTransactionsTable from '../accounts/SimpleTransactionsTable';
import { View, Text, Button, Stack } from '../common';
import { FormField, FormLabel } from '../forms';
import {
  FieldSelect,
  ConditionsList,
  getTransactionFields,
} from '../modals/EditRule';
import { Page } from '../Page';
import GenericInput from '../util/GenericInput';

export default function EditFilter() {
  let { id } = useParams();
  let location = useLocation();
  let scrollableEl = useRef();
  let history = useHistory();
  let adding = id == null;
  let filters = useFilters();

  let [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'set-filter': {
          let filter = action.filter;
          return {
            ...state,
            filter: {
              conditions: filter.conditions,
              conditionsOp: filter.conditions_op,
              name: filter.name,
              id: filter.id,
            },
          };
        }

        case 'set-field':
          let filter = { [action.field]: action.value };
          return {
            ...state,
            filter: { ...state.filter, ...filter },
          };

        case 'set-transactions':
          return { ...state, transactions: action.transactions };

        case 'form-error':
          return { ...state, error: action.error };

        default:
          throw new Error('Unknown action: ');
      }
    },
    {
      filter: { conditions: [] },
      error: null,
      transactions: [],
    },
  );

  async function loadFilter() {
    let { data } = await runQuery(
      q('transaction_filters').filter({ id }).select('*'),
    );
    return data[0];
  }

  //Set Modal (default values or pull edit data)
  useEffect(() => {
    // Run it here
    async function run() {
      if (adding) {
        let filter;
        if (location.state.inputConds) {
          filter = {
            conditions_op: 'and',
            conditions: location.state.inputConds,
          };
        } else {
          filter = {
            conditions_op: 'and',
            conditions: [{ op: 'is', field: 'payee', value: null, type: 'id' }],
          };
        }

        dispatch({ type: 'set-filter', filter });
      } else {
        let filter = await loadFilter();
        if (filter) {
          dispatch({ type: 'set-filter', filter });
        }
      }
    }
    run();
  }, []);

  //Set Transactions preview table
  useEffect(() => {
    // Flash the scrollbar
    if (scrollableEl.current) {
      let el = scrollableEl.current;
      let top = el.scrollTop;
      el.scrollTop = top + 1;
      el.scrollTop = top;
    }

    let unsubscribe;

    send('make-filters-from-conditions', {
      conditions: state.filter.conditions.map(unparse),
    }).then(({ filters }) => {
      if (filters.length > 0) {
        const conditionsOpKey =
          state.filter.conditionsOp === 'or' ? '$or' : '$and';
        let live = liveQuery(
          q('transactions')
            .filter({ [conditionsOpKey]: filters })
            .select('*'),
          data => dispatch({ type: 'set-transactions', transactions: data }),
        );
        unsubscribe = live.unsubscribe;
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [state.filter.conditions, state.filter.conditionsOp]);

  let selectedInst = useSelected('transactions', state.transactions, []);

  async function onSave() {
    dispatch({ type: 'form-error', error: null });

    let res = await sendCatch(adding ? 'filter/create' : 'filter/update', {
      state: state.filter,
      filters,
    });

    if (res.error) {
      dispatch({
        type: 'form-error',
        error: res.error.message,
        //'An error occurred while saving. Please contact help@actualbudget.com for support.',
      });
    } else {
      history.push(location.state.locationPtr.pathname, {
        callbackConditions: state.filter,
      });
    }
  }

  let editorStyle = {
    backgroundColor: colors.n10,
    borderRadius: 4,
  };

  return (
    <Page title="Saved Filter" modalSize="large">
      <Stack direction="row" style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Filter Name" htmlFor="name-field" />
          <GenericInput
            field="string"
            type="string"
            value={state.filter.name}
            onChange={e => {
              dispatch({ type: 'set-field', field: 'name', value: e });
            }}
          />
        </FormField>
      </Stack>
      <View style={{ flexShrink: 0, marginTop: 20 }}>
        <Text style={{ color: colors.n4, marginBottom: 5 }}>
          If
          <FieldSelect
            data-testid="conditions-op"
            style={{ display: 'inline-flex' }}
            fields={[
              ['and', 'all'],
              ['or', 'any'],
            ]}
            value={state.filter.conditionsOp}
            onChange={(name, value) => {
              dispatch({
                type: 'set-field',
                field: 'conditionsOp',
                value: value,
              });
            }}
          />
          of these conditions match:
        </Text>
      </View>
      <View
        innerRef={scrollableEl}
        style={{
          borderBottom: '1px solid ' + colors.border,
          overflow: 'auto',
          maxHeight: 'calc(100% - 350px)',
        }}
      >
        <View style={{ marginBottom: 20, flexShrink: 0 }}>
          <ConditionsList
            conditionsOp={state.filter.conditionsOp}
            conditions={state.filter.conditions}
            editorStyle={editorStyle}
            onChangeConditions={e => {
              dispatch({ type: 'set-field', field: 'conditions', value: e });
            }}
          />
        </View>
      </View>

      <View style={{ marginTop: 30, flex: 1 }}>
        <SelectedProvider instance={selectedInst}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.n4, marginBottom: 0 }}>
              Filter results:
            </Text>
          </View>

          <SimpleTransactionsTable
            transactions={state.transactions}
            fields={getTransactionFields('filters', state.filter.conditions)}
            style={{
              border: '1px solid ' + colors.border,
              borderRadius: 4,
              overflow: 'hidden',
              marginTop: 5,
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
          {adding ? 'Add' : 'Update'}
        </Button>
      </Stack>
    </Page>
  );
}
