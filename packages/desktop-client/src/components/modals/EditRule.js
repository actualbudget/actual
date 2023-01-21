import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  initiallyLoadPayees,
  setUndoEnabled
} from 'loot-core/src/client/actions/queries';
import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import q, { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import {
  mapField,
  friendlyOp,
  getFieldError,
  parse,
  unparse,
  makeValue,
  FIELD_TYPES,
  TYPE_INFO
} from 'loot-core/src/shared/rules';
import {
  integerToCurrency,
  integerToAmount,
  amountToInteger
} from 'loot-core/src/shared/util';
import {
  View,
  Text,
  Modal,
  Button,
  Stack,
  CustomSelect,
  Tooltip
} from 'loot-design/src/components/common';
import useSelected, {
  SelectedProvider
} from 'loot-design/src/components/useSelected';
import { colors } from 'loot-design/src/style';
import AddIcon from 'loot-design/src/svg/v0/Add';
import SubtractIcon from 'loot-design/src/svg/v0/Subtract';
import InformationOutline from 'loot-design/src/svg/v1/InformationOutline';

import SimpleTransactionsTable from '../accounts/SimpleTransactionsTable';
import { StatusBadge } from '../schedules/StatusBadge';
import { BetweenAmountInput } from '../util/AmountInput';
import DisplayId from '../util/DisplayId';
import GenericInput from '../util/GenericInput';

function updateValue(array, value, update) {
  return array.map(v => (v === value ? update() : v));
}

function applyErrors(array, errorsArray) {
  return array.map((item, i) => {
    return { ...item, error: errorsArray[i] };
  });
}

function getTransactionFields(conditions, actions) {
  let fields = ['date'];

  if (conditions.find(c => c.field === 'imported_payee')) {
    fields.push('imported_payee');
  }

  fields.push('payee');

  if (actions.find(a => a.field === 'category')) {
    fields.push('category');
  } else if (
    actions.length > 0 &&
    !['payee', 'date', 'amount'].includes(actions[0].field)
  ) {
    fields.push(actions[0].field);
  }

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
  onChange
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
        marginBottom: 5
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
          padding: '3px 5px'
        }}
      >
        {children}
      </Stack>
      {error && <FieldError type={error} />}
    </View>
  );
}

export function ConditionEditor({
  conditionFields,
  ops,
  condition,
  editorStyle,
  onChange,
  onDelete,
  onAdd
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
        <EditorButtons onAdd={onAdd} onDelete={onDelete} />
      </Stack>
    </Editor>
  );
}

function formatAmount(amount) {
  if (!amount) {
    return integerToCurrency(0);
  } else if (typeof amount === 'number') {
    return integerToCurrency(amount);
  } else {
    return `${integerToCurrency(amount.num1)} to ${integerToCurrency(
      amount.num2
    )}`;
  }
}

function ScheduleDescription({ id }) {
  let dateFormat = useSelector(state => {
    return state.prefs.local.dateFormat || 'MM/dd/yyyy';
  });
  let scheduleData = useSchedules({
    transform: useCallback(q => q.filter({ id }), [])
  });

  if (scheduleData == null) {
    return null;
  }

  if (scheduleData.schedules.length === 0) {
    return <View style={{ flex: 1 }}>{id}</View>;
  }

  let [schedule] = scheduleData.schedules;
  let status = schedule && scheduleData.statuses.get(schedule.id);

  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ marginRight: 15, flexDirection: 'row' }}>
        <Text
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          Payee:{' '}
          <DisplayId type="payees" id={schedule._payee} noneColor={colors.n5} />
        </Text>
        <Text style={{ margin: '0 5px' }}> — </Text>
        <Text style={{ flexShrink: 0 }}>
          Amount: {formatAmount(schedule._amount)}
        </Text>
        <Text style={{ margin: '0 5px' }}> — </Text>
        <Text style={{ flexShrink: 0 }}>
          Next: {monthUtils.format(schedule.next_date, dateFormat)}
        </Text>
      </View>
      <StatusBadge status={status} />
    </View>
  );
}

let actionFields = [
  'payee',
  'notes',
  'date',
  'amount',
  'category',
  'account',
  'cleared'
].map(field => [field, mapField(field)]);
function ActionEditor({ ops, action, editorStyle, onChange, onDelete, onAdd }) {
  let { field, op, value, type, error, inputKey = 'initial' } = action;

  return (
    <Editor style={editorStyle} error={error}>
      {/*<OpSelect ops={ops} value={op} onChange={onChange} />*/}

      {op === 'set' ? (
        <>
          <View style={{ padding: '5px 10px', lineHeight: '1em' }}>
            {friendlyOp(op)}
          </View>

          <FieldSelect
            fields={actionFields}
            value={field}
            onChange={onChange}
          />

          <View style={{ flex: 1 }}>
            <GenericInput
              key={inputKey}
              field={field}
              type={type}
              op={op}
              value={value}
              onChange={v => onChange('value', v)}
            />
          </View>
        </>
      ) : op === 'link-schedule' ? (
        <>
          <View style={{ padding: '5px 10px', color: colors.p4 }}>
            {friendlyOp(op)}
          </View>
          <ScheduleDescription id={value || null} />
        </>
      ) : null}

      <Stack direction="row">
        <EditorButtons
          onAdd={onAdd}
          onDelete={op !== 'link-schedule' && onDelete}
        />
      </Stack>
    </Editor>
  );
}

function StageInfo() {
  let [open, setOpen] = useState();

  return (
    <View style={{ position: 'relative', marginLeft: 5 }}>
      <View
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <InformationOutline
          style={{ width: 11, height: 11, color: colors.n4 }}
        />
      </View>
      {open && (
        <Tooltip
          position="bottom-left"
          style={{
            padding: 10,
            color: colors.n4,
            maxWidth: 450,
            lineHeight: 1.5
          }}
        >
          The stage of a rule allows you to force a specific order. Pre rules
          always run first, and post rules always run last. Within each stage
          rules are automatically ordered from least to most specific.
        </Tooltip>
      )}
    </View>
  );
}

function StageButton({ selected, children, style, onSelect }) {
  return (
    <Button
      bare
      style={[
        { fontSize: 'inherit' },
        selected && {
          backgroundColor: colors.b9,
          ':hover': { backgroundColor: colors.b9 }
        },
        style
      ]}
      onClick={onSelect}
    >
      {children}
    </Button>
  );
}

function newInput(item) {
  return { ...item, inputKey: '' + Math.random() };
}

export function ConditionsList({
  conditions,
  conditionFields,
  editorStyle,
  onChangeConditions
}) {
  function addCondition(index) {
    let field = 'payee';
    let copy = [...conditions];
    copy.splice(index + 1, 0, {
      type: FIELD_TYPES.get(field),
      field,
      op: 'is',
      value: null
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
                op: value
              })
            );
          } else if (cond.op === 'oneOf' && op !== 'oneOf') {
            return newInput(
              makeValue(cond.value.length > 0 ? cond.value[0] : null, {
                ...cond,
                op: value
              })
            );
          } else if (cond.op !== 'isbetween' && op === 'isbetween') {
            // TODO: I don't think we need `makeValue` anymore. It
            // tries to parse the value as a float and we had to
            // special-case isbetween. I don't know why we need that
            // behavior and we can probably get rid of `makeValue`
            return makeValue(
              {
                num1: amountToInteger(cond.value),
                num2: amountToInteger(cond.value)
              },
              { ...cond, op: value }
            );
          } else if (cond.op === 'isbetween' && op !== 'isbetween') {
            return makeValue(integerToAmount(cond.value.num1 || 0), {
              ...cond,
              op: value
            });
          } else {
            return { ...cond, op: value };
          }
        } else if (field === 'value') {
          return makeValue(value, cond);
        }

        return cond;
      })
    );
  }

  return conditions.length === 0 ? (
    <Button style={{ alignSelf: 'flex-start' }} onClick={addInitialCondition}>
      Add condition
    </Button>
  ) : (
    <Stack spacing={2}>
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
              conditionFields={conditionFields}
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
  'account',
  'imported_payee',
  'payee',
  'category',
  'date',
  'notes',
  'amount'
]
  .map(field => [field, mapField(field)])
  .concat([
    ['amount-inflow', mapField('amount', { inflow: true })],
    ['amount-outflow', mapField('amount', { outflow: true })]
  ]);

export default function EditRule({
  history,
  modalProps,
  defaultRule,
  onSave: originalOnSave
}) {
  let [conditions, setConditions] = useState(defaultRule.conditions.map(parse));
  let [actions, setActions] = useState(defaultRule.actions.map(parse));
  let [stage, setStage] = useState(defaultRule.stage);
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
        conditions: conditions.map(unparse)
      });

      if (filters.length > 0) {
        let { data: transactions } = await runQuery(
          q('transactions').filter({ $and: filters }).select('*')
        );
        setTransactions(transactions);
      } else {
        setTransactions([]);
      }
    }
    run();
  }, [actions, conditions]);

  let selectedInst = useSelected('transactions', transactions, []);

  function addInitialAction() {
    addAction(-1);
  }

  function addAction(index) {
    let field = 'category';

    let copy = [...actions];
    copy.splice(index + 1, 0, {
      type: FIELD_TYPES.get(field),
      field,
      op: 'set',
      value: null
    });
    setActions(copy);
  }

  function onChangeAction(action, field, value) {
    setActions(
      updateValue(actions, action, () => {
        let a = { ...action };
        a[field] = value;

        if (field === 'field') {
          a.type = FIELD_TYPES.get(a.field);
          a.value = null;
          return newInput(a);
        } else if (field === 'op') {
          a.value = null;
          a.inputKey = '' + Math.random();
          return newInput(a);
        }

        return a;
      })
    );
  }

  function onChangeStage(stage) {
    setStage(stage);
  }

  function onRemoveAction(action) {
    setActions(actions.filter(a => a !== action));
  }

  function onApply() {
    send('rule-apply-actions', {
      transactionIds: [...selectedInst.items],
      actions
    }).then(() => {
      // This makes it refetch the transactions
      setActions([...actions]);
    });
  }

  async function onSave() {
    let rule = {
      ...defaultRule,
      stage,
      conditions: conditions.map(unparse),
      actions: actions.map(unparse)
    };

    let method = rule.id ? 'rule-update' : 'rule-add';
    let { error, id: newId } = await send(method, rule);

    if (error) {
      if (error.conditionErrors) {
        setConditions(applyErrors(conditions, error.conditionErrors));
      }

      if (error.actionErrors) {
        setActions(applyErrors(actions, error.actionErrors));
      }
    } else {
      // If adding a rule, we got back an id
      if (newId) {
        rule.id = newId;
      }

      originalOnSave && originalOnSave(rule);
      modalProps.onClose();
    }
  }

  let editorStyle = {
    backgroundColor: colors.n10,
    borderRadius: 4
  };

  return (
    <Modal
      title="Rule"
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
            overflow: 'hidden'
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 15,
              padding: '0 20px'
            }}
          >
            <Text style={{ color: colors.n4, marginRight: 15 }}>
              Stage of rule:
            </Text>

            <Stack direction="row" align="center" spacing={1}>
              <StageButton
                selected={stage === 'pre'}
                onSelect={() => onChangeStage('pre')}
              >
                Pre
              </StageButton>
              <StageButton
                selected={stage === null}
                onSelect={() => onChangeStage(null)}
              >
                Default
              </StageButton>
              <StageButton
                selected={stage === 'post'}
                onSelect={() => onChangeStage('post')}
              >
                Post
              </StageButton>

              <StageInfo />
            </Stack>
          </View>

          <View
            innerRef={scrollableEl}
            style={{
              borderBottom: '1px solid ' + colors.border,
              padding: 20,
              overflow: 'auto',
              maxHeight: 'calc(100% - 300px)'
            }}
          >
            <View style={{ flexShrink: 0 }}>
              <View style={{ marginBottom: 30 }}>
                <Text style={{ color: colors.n4, marginBottom: 15 }}>
                  If all these conditions match:
                </Text>

                <ConditionsList
                  conditions={conditions}
                  conditionFields={conditionFields}
                  editorStyle={editorStyle}
                  onChangeConditions={conds => setConditions(conds)}
                />
              </View>

              <Text style={{ color: colors.n4, marginBottom: 15 }}>
                Then apply these actions:
              </Text>
              <View style={{ flex: 1 }}>
                {actions.length === 0 ? (
                  <Button
                    style={{ alignSelf: 'flex-start' }}
                    onClick={addInitialAction}
                  >
                    Add action
                  </Button>
                ) : (
                  <Stack spacing={2}>
                    {actions.map((action, i) => (
                      <View key={i}>
                        <ActionEditor
                          ops={['set', 'link-schedule']}
                          action={action}
                          editorStyle={editorStyle}
                          onChange={(name, value) => {
                            onChangeAction(action, name, value);
                          }}
                          onDelete={() => onRemoveAction(action)}
                          onAdd={() => addAction(i)}
                        />
                      </View>
                    ))}
                  </Stack>
                )}
              </View>
            </View>
          </View>

          <SelectedProvider instance={selectedInst}>
            <View style={{ padding: '20px', flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12
                }}
              >
                <Text style={{ color: colors.n4, marginBottom: 0 }}>
                  This rule applies to these transactions:
                </Text>

                <View style={{ flex: 1 }} />
                <Button
                  disabled={selectedInst.items.size === 0}
                  onClick={onApply}
                >
                  Apply actions ({selectedInst.items.size})
                </Button>
              </View>

              <SimpleTransactionsTable
                transactions={transactions}
                fields={getTransactionFields(conditions, actions)}
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
