import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useHistory } from 'react-router-dom';

import {
  initiallyLoadPayees,
  setUndoEnabled,
} from 'loot-core/src/client/actions/queries';
import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import {
  mapField,
  friendlyOp,
  getFieldError,
  unparse,
  makeValue,
  FIELD_TYPES,
  TYPE_INFO,
} from 'loot-core/src/shared/rules';
import { integerToAmount, amountToInteger } from 'loot-core/src/shared/util';

import useSelected, { SelectedProvider } from '../../hooks/useSelected';
import AddIcon from '../../icons/v0/Add';
import SubtractIcon from '../../icons/v0/Subtract';
import { colors } from '../../style';
import SimpleTransactionsTable from '../accounts/SimpleTransactionsTable';
import { View, Text, Button, Stack, CustomSelect } from '../common';
import { FormField, FormLabel } from '../forms';
import { Page } from '../Page';
import { BetweenAmountInput } from '../util/AmountInput';
import GenericInput from '../util/GenericInput';

function updateValue(array, value, update) {
  return array.map(v => (v === value ? update() : v));
}

function getTransactionFields(conditions) {
  let fields = ['date'];

  if (conditions.find(c => c.field === 'imported_payee')) {
    fields.push('imported_payee');
  }

  fields.push('account');
  fields.push('payee');
  fields.push('category');
  fields.push('amount');

  return fields;
}

export function FieldSelect({ fields, style, value, onChange }) {
  return (
    <View style={style}>
      <CustomSelect
        options={fields}
        value={value}
        onChange={value => onChange('field', value)}
        style={{ color: colors.p4 }}
      />
    </View>
  );
}

export function OpSelect({
  ops,
  type,
  style,
  value,
  formatOp = friendlyOp,
  onChange,
}) {
  // We don't support the `contains` operator for the id type for
  // rules yet
  if (type === 'id') {
    ops = ops.filter(op => op !== 'contains');
  }

  return (
    <CustomSelect
      options={ops.map(op => [op, formatOp(op, type)])}
      value={value}
      onChange={value => onChange('op', value)}
      style={style}
    />
  );
}

function EditorButtons({ onAdd, onDelete, style }) {
  return (
    <>
      {onDelete && (
        <Button
          bare
          onClick={onDelete}
          style={{ padding: 7 }}
          aria-label="Delete entry"
        >
          <SubtractIcon style={{ width: 8, height: 8 }} />
        </Button>
      )}
      {onAdd && (
        <Button
          bare
          onClick={onAdd}
          style={{ padding: 7 }}
          aria-label="Add entry"
        >
          <AddIcon style={{ width: 10, height: 10 }} />
        </Button>
      )}
    </>
  );
}

function FieldError({ type }) {
  return (
    <Text
      style={{
        fontSize: 12,
        textAlign: 'center',
        color: colors.r5,
        marginBottom: 5,
      }}
    >
      {getFieldError(type)}
    </Text>
  );
}

function Editor({ error, style, children }) {
  return (
    <View style={style} data-testid="editor-row">
      <Stack
        direction="row"
        align="center"
        spacing={1}
        style={{
          padding: '3px 5px',
        }}
      >
        {children}
      </Stack>
      {error && <FieldError type={error} />}
    </View>
  );
}

export function ConditionEditor({
  ops,
  condition,
  editorStyle,
  onChange,
  onDelete,
  onAdd,
}) {
  let { field, op, value, type, options, error } = condition;

  if (field === 'amount' && options) {
    if (options.inflow) {
      field = 'amount-inflow';
    } else if (options.outflow) {
      field = 'amount-outflow';
    }
  }

  let valueEditor;
  if (type === 'number' && op === 'isbetween') {
    valueEditor = (
      <BetweenAmountInput
        defaultValue={value}
        onChange={v => onChange('value', v)}
      />
    );
  } else {
    valueEditor = (
      <GenericInput
        field={field}
        type={type}
        value={value}
        multi={op === 'oneOf'}
        onChange={v => onChange('value', v)}
      />
    );
  }

  return (
    <Editor style={editorStyle} error={error}>
      <FieldSelect fields={conditionFields} value={field} onChange={onChange} />
      <OpSelect ops={ops} value={op} type={type} onChange={onChange} />

      <View style={{ flex: 1 }}>{valueEditor}</View>

      <Stack direction="row">
        <EditorButtons
          onAdd={onAdd}
          onDelete={field === 'date' ? null : onDelete}
        />
      </Stack>
    </Editor>
  );
}

function newInput(item) {
  return { ...item, inputKey: '' + Math.random() };
}

export function ConditionsList({
  conditionsOp,
  conditions,
  editorStyle,
  onChangeConditions,
}) {
  function addCondition(index) {
    // (remove the inflow and outflow pseudo-fields since they’d be a pain to get right)
    let fields = conditionFields
      .map(f => f[0])
      .filter(f => f !== 'amount-inflow' && f !== 'amount-outflow');

    // suggest a sensible next field: the same if 'or' or different if 'and'
    if (conditions.length && conditionsOp === 'or') {
      fields = [conditions[0].field];
    } else {
      fields = fields.filter(
        f => !conditions.some(c => c.field.includes(f) || f.includes(c.field)),
      );
    }
    let field = fields[0] || 'payee';

    let copy = [...conditions];
    copy.splice(index + 1, 0, {
      type: FIELD_TYPES.get(field),
      field,
      op: 'is',
      value: null,
    });
    onChangeConditions(copy);
  }

  function addInitialCondition() {
    addCondition(-1);
  }

  function removeCondition(cond) {
    onChangeConditions(conditions.filter(c => c !== cond));
  }

  function updateCondition(cond, field, value) {
    onChangeConditions(
      updateValue(conditions, cond, () => {
        if (field === 'field') {
          let newCond = { field: value };

          if (value === 'amount-inflow') {
            newCond.field = 'amount';
            newCond.options = { inflow: true };
          } else if (value === 'amount-outflow') {
            newCond.field = 'amount';
            newCond.options = { outflow: true };
          }

          newCond.type = FIELD_TYPES.get(newCond.field);

          let prevType = FIELD_TYPES.get(cond.field);
          if (
            (prevType === 'string' || prevType === 'number') &&
            prevType === newCond.type &&
            cond.op !== 'isbetween'
          ) {
            // Don't clear the value & op if the type is string/number and
            // the type hasn't changed
            newCond.op = cond.op;
            return newInput(makeValue(cond.value, newCond));
          } else {
            newCond.op = TYPE_INFO[newCond.type].ops[0];
            return newInput(makeValue(null, newCond));
          }
        } else if (field === 'op') {
          let op = value;

          // Switching between oneOf and other operators is a
          // special-case. It changes the input type, so we need to
          // clear the value
          if (cond.op !== 'oneOf' && op === 'oneOf') {
            return newInput(
              makeValue(cond.value != null ? [cond.value] : [], {
                ...cond,
                op: value,
              }),
            );
          } else if (cond.op === 'oneOf' && op !== 'oneOf') {
            return newInput(
              makeValue(cond.value.length > 0 ? cond.value[0] : null, {
                ...cond,
                op: value,
              }),
            );
          } else if (cond.op !== 'isbetween' && op === 'isbetween') {
            // TODO: I don't think we need `makeValue` anymore. It
            // tries to parse the value as a float and we had to
            // special-case isbetween. I don't know why we need that
            // behavior and we can probably get rid of `makeValue`
            return makeValue(
              {
                num1: amountToInteger(cond.value),
                num2: amountToInteger(cond.value),
              },
              { ...cond, op: value },
            );
          } else if (cond.op === 'isbetween' && op !== 'isbetween') {
            return makeValue(integerToAmount(cond.value.num1 || 0), {
              ...cond,
              op: value,
            });
          } else {
            return { ...cond, op: value };
          }
        } else if (field === 'value') {
          return makeValue(value, cond);
        }

        return cond;
      }),
    );
  }

  return conditions.length === 0 ? (
    <Button style={{ alignSelf: 'flex-start' }} onClick={addInitialCondition}>
      Add condition
    </Button>
  ) : (
    <Stack spacing={2} data-testid="condition-list">
      {conditions.map((cond, i) => {
        let ops = TYPE_INFO[cond.type].ops;

        // Hack for now, these ops should be the only ones available
        // for recurring dates
        if (cond.type === 'date' && cond.value && cond.value.frequency) {
          ops = ['is', 'isapprox'];
        } else if (
          cond.options &&
          (cond.options.inflow || cond.options.outflow)
        ) {
          ops = ops.filter(op => op !== 'isbetween');
        }

        return (
          <View key={i}>
            <ConditionEditor
              editorStyle={editorStyle}
              ops={ops}
              condition={cond}
              onChange={(name, value) => {
                updateCondition(cond, name, value);
              }}
              onDelete={() => removeCondition(cond)}
              onAdd={() => addCondition(i)}
            />
          </View>
        );
      })}
    </Stack>
  );
}

// TODO:
// * Dont touch child transactions?

let conditionFields = [
  'imported_payee',
  'account',
  'category',
  'date',
  'payee',
  'notes',
  'amount',
]
  .map(field => [field, mapField(field)])
  .concat([
    ['amount-inflow', mapField('amount', { inflow: true })],
    ['amount-outflow', mapField('amount', { outflow: true })],
  ]);

export default function EditFilter() {
  let [conditions, setConditions] = useState([
    {
      field: 'payee',
      op: 'is',
      value: null,
      type: 'id',
    },
  ]);
  let [conditionsOp, setConditionsOp] = useState('and');
  let { id, initialFields } = useParams();
  let [transactions, setTransactions] = useState([]);
  let [name, setName] = useState('None');
  let dispatch = useDispatch();
  let scrollableEl = useRef();
  let history = useHistory();
  let adding = id == null;

  useEffect(() => {
    dispatch(initiallyLoadPayees());

    // Disable undo while this modal is open
    setUndoEnabled(false);
    return () => setUndoEnabled(true);
  }, []);

  async function loadFilter() {
    let { data } = await runQuery(q('transaction_filters').filter({ id }).select('*'));
    return data[0];
  }

  useEffect(() => {
    // Flash the scrollbar
    if (scrollableEl.current) {
      let el = scrollableEl.current;
      let top = el.scrollTop;
      el.scrollTop = top + 1;
      el.scrollTop = top;
    }

    // Run it here
    async function run() {
      if (adding) {
        let { filters } = await send('make-filters-from-conditions', {
          conditions: conditions.map(unparse),
        });

        if (filters.length > 0) {
          const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
          let { data: transactions } = await runQuery(
            q('transactions')
              .filter({ [conditionsOpKey]: filters })
              .select('*'),
          );
          setTransactions(transactions);
        } else {
          setTransactions([]);
        }
      } else {
        let filters = await loadFilter();

        //if (filters) {
        //  setConditions(filters.conditions);
        //  setName(filters.name);
        //}
      }
    }
    run();
  }, [conditions, conditionsOp]);

  let selectedInst = useSelected('transactions', transactions, []);

  function onChangeConditionsOp(value) {
    setConditionsOp(value);
  }

  function onChangeName(value) {
    setName(value);
  }

  async function onSave() {
    let res = await sendCatch(adding ? 'filter/create' : 'filter/update', {
      name: name,
      conditions: conditions.map(unparse),
    });

    if (res.error) {
      dispatch({
        type: 'form-error',
        error:
          'An error occurred while saving. Please contact help@actualbudget.com for support.',
      });
    } else {
      history.goBack();
    }
  }

  let editorStyle = {
    backgroundColor: colors.n10,
    borderRadius: 4,
  };

  return (
    <Page title="Custom Filter" modalSize="medium">
      <Stack direction="row" style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title="Filter Name" htmlFor="name-field" />
          <GenericInput
            field="string"
            type="string"
            value={name}
            onChange={onChangeName}
          />
        </FormField>
      </Stack>
      <View style={{ flexShrink: 0 }}>
        <View style={{ marginBottom: 10, marginTop: 20 }}>
          <Text style={{ color: colors.n4, marginBottom: 5 }}>
            If
            <FieldSelect
              data-testid="conditions-op"
              style={{ display: 'inline-flex' }}
              fields={[
                ['and', 'all'],
                ['or', 'any'],
              ]}
              value={conditionsOp}
              onChange={onChangeConditionsOp}
            />
            of these conditions match:
          </Text>

          <ConditionsList
            conditionsOp={conditionsOp}
            conditions={conditions}
            editorStyle={editorStyle}
            onChangeConditions={conds => setConditions(conds)}
          />
        </View>
      </View>

      <SelectedProvider instance={selectedInst}>
        <View style={{ padding: '20px', flex: 1 }}>
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
            transactions={transactions}
            fields={getTransactionFields(conditions)}
            style={{
              border: '1px solid ' + colors.border,
              borderRadius: 4,
              overflow: 'hidden',
              marginTop: 5,
            }}
          />

          <Stack direction="row" justify="flex-end" style={{ marginTop: 20 }}>
            <Button
              style={{ marginRight: 10 }}
              onClick={() => history.goBack()}
            >
              Cancel
            </Button>
            <Button primary onClick={onSave}>
              {adding ? 'Add' : 'Save'}
            </Button>
          </Stack>
        </View>
      </SelectedProvider>
    </Page>
  );
}
