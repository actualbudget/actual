import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';

import {
  initiallyLoadPayees,
  setUndoEnabled,
} from 'loot-core/src/client/actions/queries';
import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import {
  mapField,
  friendlyOp,
  getFieldError,
  parse,
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
import { View, Text, Modal, Button, Stack, CustomSelect } from '../common';
import { BetweenAmountInput } from '../util/AmountInput';
import GenericInput from '../util/GenericInput';

function updateValue(array, value, update) {
  return array.map(v => (v === value ? update() : v));
}

function applyErrors(array, errorsArray) {
  return array.map((item, i) => {
    return { ...item, error: errorsArray[i] };
  });
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
        <Button bare onClick={onDelete} style={{ padding: 7 }}>
          <SubtractIcon style={{ width: 8, height: 8 }} />
        </Button>
      )}
      {onAdd && (
        <Button bare onClick={onAdd} style={{ padding: 7 }}>
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
    <View style={style}>
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
  isSchedule,
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
              isSchedule={isSchedule}
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
  'account',
  'imported_payee',
  'payee',
  'category',
  'date',
  'notes',
  'amount',
]
  .map(field => [field, mapField(field)])
  .concat([
    ['amount-inflow', mapField('amount', { inflow: true })],
    ['amount-outflow', mapField('amount', { outflow: true })],
  ]);

export default function EditFilter({
  modalProps,
  defaultFilter,
  onSave: originalOnSave,
}) {
  let [conditions, setConditions] = useState(
    defaultFilter.conditions.map(parse),
  );
  //let [title, setTitle] = useState(defaultFilter.stage);
  let [conditionsOp, setConditionsOp] = useState(defaultFilter.conditionsOp);
  let [transactions, setTransactions] = useState([]);
  let dispatch = useDispatch();
  let scrollableEl = useRef();

  useEffect(() => {
    dispatch(initiallyLoadPayees());

    // Disable undo while this modal is open
    setUndoEnabled(false);
    return () => setUndoEnabled(true);
  }, []);

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
      let { filters } = await send('make-filters-from-conditions', {
        conditions: conditions.map(unparse),
      });

      if (filters.length > 0) {
        let { data: transactions } = await runQuery(
          q('transactions').filter({ $and: filters }).select('*'),
        );
        setTransactions(transactions);
      } else {
        setTransactions([]);
      }
    }
    run();
  }, [conditions]);

  let selectedInst = useSelected('transactions', transactions, []);

  function onChangeConditionsOp(name, value) {
    setConditionsOp(value);
  }

  async function onSave() {
    let filter = {
      ...defaultFilter,
      //title,
      conditions: conditions.map(unparse),
    };

    let method = filter.id ? 'filter-update' : 'filter-add';
    let { error, id: newId } = await send(method, filter);

    if (error) {
      if (error.conditionErrors) {
        setConditions(applyErrors(conditions, error.conditionErrors));
      }
    } else {
      // If adding a filter, we got back an id
      if (newId) {
        filter.id = newId;
      }

      originalOnSave && originalOnSave(filter);
      modalProps.onClose();
    }
  }

  let editorStyle = {
    backgroundColor: colors.n10,
    borderRadius: 4,
  };

  return (
    <Modal
      title="Custom Filter"
      padding={0}
      {...modalProps}
      style={[modalProps.style, { flex: 'inherit', maxWidth: '90%' }]}
    >
      {() => (
        <View
          style={{
            maxWidth: '100%',
            width: 900,
            height: '80vh',
            flexGrow: 0,
            flexShrink: 0,
            flexBasis: 'auto',
            overflow: 'hidden',
          }}
        >
          <View
            innerRef={scrollableEl}
            style={{
              borderBottom: '1px solid ' + colors.border,
              padding: 20,
              overflow: 'auto',
              maxHeight: 'calc(100% - 300px)',
            }}
          >
            <View style={{ flexShrink: 0 }}>
              <View style={{ marginBottom: 30 }}>
                <Text style={{ color: colors.n4, marginBottom: 15 }}>
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
                style={{ border: '1px solid ' + colors.border }}
              />

              <Stack
                direction="row"
                justify="flex-end"
                style={{ marginTop: 20 }}
              >
                <Button onClick={() => modalProps.onClose()}>Cancel</Button>
                <Button primary onClick={() => onSave()}>
                  Save
                </Button>
              </Stack>
            </View>
          </SelectedProvider>
        </View>
      )}
    </Modal>
  );
}
