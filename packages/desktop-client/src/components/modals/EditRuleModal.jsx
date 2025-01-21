import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { css } from '@emotion/css';
import { v4 as uuid } from 'uuid';

import { initiallyLoadPayees } from 'loot-core/client/queries/queriesSlice';
import { enableUndo, disableUndo } from 'loot-core/client/undo';
import { useSchedules } from 'loot-core/src/client/data-hooks/schedules';
import { runQuery } from 'loot-core/src/client/query-helpers';
import { send } from 'loot-core/src/platform/client/fetch';
import * as monthUtils from 'loot-core/src/shared/months';
import { q } from 'loot-core/src/shared/query';
import {
  mapField,
  friendlyOp,
  getFieldError,
  parse,
  unparse,
  makeValue,
  FIELD_TYPES,
  ALLOCATION_METHODS,
  isValidOp,
  getValidOps,
} from 'loot-core/src/shared/rules';
import {
  integerToCurrency,
  integerToAmount,
  amountToInteger,
} from 'loot-core/src/shared/util';

import { useDateFormat } from '../../hooks/useDateFormat';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useSelected, SelectedProvider } from '../../hooks/useSelected';
import { SvgDelete, SvgAdd, SvgSubtract } from '../../icons/v0';
import { SvgAlignLeft, SvgCode, SvgInformationOutline } from '../../icons/v1';
import { useDispatch } from '../../redux';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { Tooltip } from '../common/Tooltip';
import { View } from '../common/View';
import { StatusBadge } from '../schedules/StatusBadge';
import { SimpleTransactionsTable } from '../transactions/SimpleTransactionsTable';
import { BetweenAmountInput } from '../util/AmountInput';
import { DisplayId } from '../util/DisplayId';
import { GenericInput } from '../util/GenericInput';

function updateValue(array, value, update) {
  return array.map(v => (v === value ? update() : v));
}

function applyErrors(array, errorsArray) {
  return array.map((item, i) => {
    return { ...item, error: errorsArray[i] };
  });
}

function getTransactionFields(conditions, actions) {
  const fields = ['date'];

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
    <View style={style} data-testid="field-select">
      <Select
        bare
        options={fields}
        value={value}
        onChange={onChange}
        className={css({
          color: theme.pageTextPositive,
          '&[data-hovered]': { color: theme.pageTextPositive },
        })}
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
  const opOptions = useMemo(() => {
    const options = ops
      // We don't support the `contains`, `doesNotContain`, `matches` operators
      // for the id type rules yet
      // TODO: Add matches op support for payees, accounts, categories.
      .filter(op =>
        type === 'id'
          ? !['contains', 'matches', 'doesNotContain', 'hasTags'].includes(op)
          : true,
      )
      .map(op => [op, formatOp(op, type)]);

    if (type === 'string' || type === 'id') {
      options.splice(Math.ceil(options.length / 2), 0, Menu.line);
    }

    return options;
  }, [formatOp, ops, type]);

  return (
    <View data-testid="op-select">
      <Select
        bare
        options={opOptions}
        value={value}
        onChange={value => onChange('op', value)}
        style={style}
      />
    </View>
  );
}

function SplitAmountMethodSelect({ options, style, value, onChange }) {
  return (
    <View
      style={{ color: theme.pageTextPositive, ...style }}
      data-testid="field-select"
    >
      <Select
        bare
        options={options}
        value={value}
        onChange={value => onChange('method', value)}
      />
    </View>
  );
}

function EditorButtons({ onAdd, onDelete }) {
  return (
    <>
      {onDelete && (
        <Button
          variant="bare"
          onPress={onDelete}
          style={{ padding: 7 }}
          aria-label="Delete entry"
        >
          <SvgSubtract style={{ width: 8, height: 8, color: 'inherit' }} />
        </Button>
      )}
      {onAdd && (
        <Button
          variant="bare"
          onPress={onAdd}
          style={{ padding: 7 }}
          aria-label="Add entry"
        >
          <SvgAdd style={{ width: 10, height: 10, color: 'inherit' }} />
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
        color: theme.errorText,
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

function ConditionEditor({
  ops,
  condition,
  editorStyle,
  isSchedule,
  onChange,
  onDelete,
  onAdd,
}) {
  const {
    field: originalField,
    op,
    value,
    type,
    options,
    error,
    inputKey,
  } = condition;

  let field = originalField;
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
        key={inputKey}
        defaultValue={value}
        onChange={v => onChange('value', v)}
      />
    );
  } else {
    valueEditor = (
      <GenericInput
        key={inputKey}
        field={field}
        type={type}
        value={value}
        op={op}
        multi={op === 'oneOf' || op === 'notOneOf'}
        onChange={v => onChange('value', v)}
        numberFormatType="currency"
      />
    );
  }

  return (
    <Editor style={editorStyle} error={error}>
      <FieldSelect
        fields={conditionFields}
        value={field}
        onChange={value => onChange('field', value)}
      />
      <OpSelect ops={ops} value={op} type={type} onChange={onChange} />

      <View style={{ flex: 1 }}>{valueEditor}</View>

      <Stack direction="row">
        <EditorButtons
          onAdd={onAdd}
          onDelete={isSchedule && field === 'date' ? null : onDelete}
        />
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
      amount.num2,
    )}`;
  }
}

function ScheduleDescription({ id }) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const scheduleQuery = useMemo(
    () => q('schedules').filter({ id }).select('*'),
    [id],
  );
  const {
    schedules,
    statuses: scheduleStatuses,
    isLoading: isSchedulesLoading,
  } = useSchedules({ query: scheduleQuery });

  if (isSchedulesLoading) {
    return null;
  }

  if (schedules.length === 0) {
    return <View style={{ flex: 1 }}>{id}</View>;
  }

  const [schedule] = schedules;
  const status = schedule && scheduleStatuses.get(schedule.id);

  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ marginRight: 15, flexDirection: 'row' }}>
        <Text
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <Trans>Payee:</Trans>{' '}
          <DisplayId
            type="payees"
            id={schedule._payee}
            noneColor={theme.pageTextLight}
          />
        </Text>
        <Text style={{ margin: '0 5px' }}> — </Text>
        <Text style={{ flexShrink: 0 }}>
          <Trans>Amount:</Trans> {formatAmount(schedule._amount)}
        </Text>
        <Text style={{ margin: '0 5px' }}> — </Text>
        <Text style={{ flexShrink: 0 }}>
          <Trans>
            Next: {{ month: monthUtils.format(schedule.next_date, dateFormat) }}
          </Trans>
        </Text>
      </View>
      <StatusBadge status={status} />
    </View>
  );
}

const actionFields = [
  'category',
  'payee',
  'payee_name',
  'notes',
  'cleared',
  'account',
  'date',
  'amount',
].map(field => [field, mapField(field)]);
const parentOnlyFields = ['amount', 'cleared', 'account', 'date'];
const splitActionFields = actionFields.filter(
  ([field]) => !parentOnlyFields.includes(field),
);
const allocationMethodOptions = Object.entries(ALLOCATION_METHODS);
function ActionEditor({ action, editorStyle, onChange, onDelete, onAdd }) {
  const { t } = useTranslation();
  const {
    field,
    op,
    value,
    type,
    error,
    inputKey = 'initial',
    options,
  } = action;

  const templated = options?.template !== undefined;

  // Even if the feature flag is disabled, we still want to be able to turn off templating
  const actionTemplating = useFeatureFlag('actionTemplating');
  const isTemplatingEnabled = actionTemplating || templated;

  const fields = (
    options?.splitIndex ? splitActionFields : actionFields
  ).filter(([s]) => actionTemplating || !s.includes('_name') || field === s);

  return (
    <Editor style={editorStyle} error={error}>
      {op === 'set' ? (
        <>
          <OpSelect
            ops={['set', 'prepend-notes', 'append-notes']}
            value={op}
            onChange={onChange}
          />

          <FieldSelect
            fields={fields}
            value={field}
            onChange={value => onChange('field', value)}
          />

          <View style={{ flex: 1 }}>
            <GenericInput
              key={inputKey}
              field={field}
              type={templated ? 'string' : type}
              op={op}
              value={options?.template ?? value}
              onChange={v => onChange('value', v)}
              numberFormatType="currency"
            />
          </View>
          {/*Due to that these fields have id's as value it is not helpful to have templating here*/}
          {isTemplatingEnabled &&
            ['payee', 'category', 'account'].indexOf(field) === -1 && (
              <Button
                variant="bare"
                style={{
                  padding: 5,
                }}
                aria-label={
                  templated ? t('Disable templating') : t('Enable templating')
                }
                onPress={() => onChange('template', !templated)}
              >
                {templated ? (
                  <SvgCode
                    style={{ width: 12, height: 12, color: 'inherit' }}
                  />
                ) : (
                  <SvgAlignLeft
                    style={{ width: 12, height: 12, color: 'inherit' }}
                  />
                )}
              </Button>
            )}
        </>
      ) : op === 'set-split-amount' ? (
        <>
          <View style={{ padding: '5px 10px', lineHeight: '1em' }}>
            {t('allocate')}
          </View>

          <SplitAmountMethodSelect
            options={allocationMethodOptions}
            value={options.method}
            onChange={onChange}
          />

          <View style={{ flex: 1 }}>
            {options.method !== 'remainder' && (
              <GenericInput
                key={inputKey}
                field={field}
                op={op}
                type="number"
                numberFormatType={
                  options.method === 'fixed-percent' ? 'percentage' : 'currency'
                }
                value={value}
                onChange={v => onChange('value', v)}
              />
            )}
          </View>
        </>
      ) : op === 'link-schedule' ? (
        <>
          <View
            style={{
              padding: '5px 10px',
              color: theme.pageTextPositive,
            }}
          >
            {friendlyOp(op)}
          </View>
          <ScheduleDescription id={value || null} />
        </>
      ) : op === 'prepend-notes' || op === 'append-notes' ? (
        <>
          <OpSelect
            ops={['set', 'prepend-notes', 'append-notes']}
            value={op}
            onChange={onChange}
          />

          <View style={{ flex: 1 }}>
            <GenericInput
              key={inputKey}
              field={field}
              type="string"
              op={op}
              value={value}
              onChange={v => onChange('value', v)}
            />
          </View>
        </>
      ) : null}

      <Stack direction="row">
        <EditorButtons
          onAdd={onAdd}
          onDelete={
            (op === 'set' || op === 'prepend-notes' || op === 'append-notes') &&
            onDelete
          }
        />
      </Stack>
    </Editor>
  );
}

function StageInfo() {
  return (
    <View style={{ position: 'relative', marginLeft: 5 }}>
      <Tooltip
        content={
          <Trans>
            The stage of a rule allows you to force a specific order. Pre rules
            always run first, and post rules always run last. Within each stage
            rules are automatically ordered from least to most specific.
          </Trans>
        }
        placement="bottom start"
        style={{
          ...styles.tooltip,
          padding: 10,
          color: theme.pageTextLight,
          maxWidth: 450,
          lineHeight: 1.5,
        }}
      >
        <SvgInformationOutline
          style={{ width: 11, height: 11, color: theme.pageTextLight }}
        />
      </Tooltip>
    </View>
  );
}

function StageButton({ selected, children, style, onSelect }) {
  return (
    <Button
      variant="bare"
      style={{
        fontSize: 'inherit',
        ...(selected && {
          backgroundColor: theme.pillBackgroundSelected,
          ':hover': { backgroundColor: theme.pillBackgroundSelected },
        }),
        ...style,
      }}
      onPress={onSelect}
    >
      {children}
    </Button>
  );
}

function newInput(item) {
  return { ...item, inputKey: uuid() };
}

function ConditionsList({
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
    const field = fields[0] || 'payee';

    const copy = [...conditions];
    copy.splice(index + 1, 0, {
      type: FIELD_TYPES.get(field),
      field,
      op: 'is',
      value: null,
      inputKey: uuid(),
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
          const newCond = { field: value };

          if (value === 'amount-inflow') {
            newCond.field = 'amount';
            newCond.options = { inflow: true };
          } else if (value === 'amount-outflow') {
            newCond.field = 'amount';
            newCond.options = { outflow: true };
          }

          newCond.type = FIELD_TYPES.get(newCond.field);

          const prevType = FIELD_TYPES.get(cond.field);
          if (
            (prevType === 'string' || prevType === 'number') &&
            prevType === newCond.type &&
            cond.op !== 'isbetween' &&
            isValidOp(newCond.field, cond.op)
          ) {
            // Don't clear the value & op if the type is string/number and
            // the type hasn't changed
            newCond.op = cond.op;
            return newInput(makeValue(cond.value, newCond));
          } else {
            newCond.op = getValidOps(newCond.field)[0];
            return newInput(makeValue(null, newCond));
          }
        } else if (field === 'op') {
          const op = value;

          // Switching between oneOf and other operators is a
          // special-case. It changes the input type, so we need to
          // clear the value
          if (
            cond.op !== 'oneOf' &&
            cond.op !== 'notOneOf' &&
            (op === 'oneOf' || op === 'notOneOf')
          ) {
            return newInput(
              makeValue(cond.value != null ? [cond.value] : [], {
                ...cond,
                op: value,
              }),
            );
          } else if (
            (cond.op === 'oneOf' || cond.op === 'notOneOf') &&
            op !== 'oneOf' &&
            op !== 'notOneOf'
          ) {
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
    <Button style={{ alignSelf: 'flex-start' }} onPress={addInitialCondition}>
      <Trans>Add condition</Trans>
    </Button>
  ) : (
    <Stack spacing={2} data-testid="condition-list">
      {conditions.map((cond, i) => {
        let ops = getValidOps(cond.field);

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

const getActions = splits => splits.flatMap(s => s.actions);
const getUnparsedActions = splits => getActions(splits).map(unparse);

// TODO:
// * Dont touch child transactions?

const conditionFields = [
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

export function EditRuleModal({
  rule: defaultRule,
  onSave: originalOnSave = undefined,
}) {
  const { t } = useTranslation();
  const [conditions, setConditions] = useState(
    defaultRule.conditions.map(parse).map(c => ({ ...c, inputKey: uuid() })),
  );
  const [actionSplits, setActionSplits] = useState(() => {
    const parsedActions = defaultRule.actions.map(parse);
    return parsedActions.reduce(
      (acc, action) => {
        const splitIndex = action.options?.splitIndex ?? 0;
        acc[splitIndex] = acc[splitIndex] ?? { id: uuid(), actions: [] };
        acc[splitIndex].actions.push({ ...action, inputKey: uuid() });
        return acc;
      },
      // The pre-split group is always there
      [{ id: uuid(), actions: [] }],
    );
  });
  const [stage, setStage] = useState(defaultRule.stage);
  const [conditionsOp, setConditionsOp] = useState(defaultRule.conditionsOp);
  const [transactions, setTransactions] = useState([]);
  const dispatch = useDispatch();
  const scrollableEl = useRef();

  const isSchedule = getActions(actionSplits).some(
    action => action.op === 'link-schedule',
  );

  useEffect(() => {
    dispatch(initiallyLoadPayees());

    // Disable undo while this modal is open
    disableUndo();
    return () => enableUndo();
  }, [dispatch]);

  useEffect(() => {
    // Flash the scrollbar
    if (scrollableEl.current) {
      const el = scrollableEl.current;
      const top = el.scrollTop;
      el.scrollTop = top + 1;
      el.scrollTop = top;
    }

    // Run it here
    async function run() {
      const { filters } = await send('make-filters-from-conditions', {
        conditions: conditions.map(unparse),
      });

      if (filters.length > 0) {
        const conditionsOpKey = conditionsOp === 'or' ? '$or' : '$and';
        const parentOnlyCondition =
          actionSplits.length > 1 ? { is_child: false } : {};
        const { data: transactions } = await runQuery(
          q('transactions')
            .filter({ [conditionsOpKey]: filters, ...parentOnlyCondition })
            .select('*'),
        );
        setTransactions(transactions);
      } else {
        setTransactions([]);
      }
    }
    run();
  }, [actionSplits, conditions, conditionsOp]);

  const selectedInst = useSelected('transactions', transactions, []);

  function addInitialAction() {
    addActionToSplitAfterIndex(0, -1);
  }

  function addActionToSplitAfterIndex(splitIndex, actionIndex) {
    let newAction;
    if (splitIndex && !actionSplits[splitIndex]?.actions?.length) {
      actionSplits[splitIndex] = { id: uuid(), actions: [] };
      newAction = {
        op: 'set-split-amount',
        options: { method: 'remainder', splitIndex },
        value: null,
        inputKey: uuid(),
      };
    } else {
      const fieldsArray = splitIndex === 0 ? actionFields : splitActionFields;
      let fields = fieldsArray.map(f => f[0]);
      for (const action of actionSplits[splitIndex].actions) {
        fields = fields.filter(f => f !== action.field);
      }
      const field = fields[0] || 'category';
      newAction = {
        type: FIELD_TYPES.get(field),
        field,
        op: 'set',
        value: null,
        options: { splitIndex },
        inputKey: uuid(),
      };
    }

    const actionsCopy = [...actionSplits[splitIndex].actions];
    actionsCopy.splice(actionIndex + 1, 0, newAction);
    const copy = [...actionSplits];
    copy[splitIndex] = { ...actionSplits[splitIndex], actions: actionsCopy };
    setActionSplits(copy);
  }

  function onChangeAction(action, field, value) {
    setActionSplits(
      actionSplits.map(({ id, actions }) => ({
        id,
        actions: updateValue(actions, action, () => {
          const a = { ...action };

          if (field === 'method') {
            a.options = { ...a.options, method: value };
          } else if (field === 'template') {
            if (value) {
              a.options = { ...a.options, template: a.value };
            } else {
              a.options = { ...a.options, template: undefined };
              if (a.type !== 'string') a.value = null;
            }
          } else {
            a[field] = value;
            if (a.options?.template !== undefined) {
              a.options.template = value;
            }

            if (field === 'field') {
              a.type = FIELD_TYPES.get(a.field);
              a.value = null;
              a.options = { ...a.options, template: undefined };
              return newInput(a);
            } else if (field === 'op') {
              a.value = null;
              a.inputKey = '' + Math.random();
              a.options = { ...a.options, template: undefined };
              return newInput(a);
            }
          }

          return a;
        }),
      })),
    );
  }

  function onChangeStage(stage) {
    setStage(stage);
  }

  function onChangeConditionsOp(value) {
    setConditionsOp(value);
  }

  function onRemoveAction(action) {
    setActionSplits(splits =>
      splits.map(({ id, actions }) => ({
        id,
        actions: actions.filter(a => a !== action),
      })),
    );
  }

  function onRemoveSplit(splitIndexToRemove) {
    setActionSplits(splits => {
      const copy = [];
      splits.forEach(({ id }, index) => {
        if (index === splitIndexToRemove) {
          return;
        }
        copy.push({ id, actions: [] });
      });
      getActions(splits).forEach(action => {
        const currentSplitIndex = action.options?.splitIndex ?? 0;
        if (currentSplitIndex === splitIndexToRemove) {
          return;
        }
        const newSplitIndex =
          currentSplitIndex > splitIndexToRemove
            ? currentSplitIndex - 1
            : currentSplitIndex;
        copy[newSplitIndex].actions.push({
          ...action,
          options: { ...action.options, splitIndex: newSplitIndex },
        });
      });
      return copy;
    });
  }

  function onApply() {
    const selectedTransactions = transactions.filter(({ id }) =>
      selectedInst.items.has(id),
    );
    send('rule-apply-actions', {
      transactions: selectedTransactions,
      actions: getUnparsedActions(actionSplits),
    }).then(() => {
      // This makes it refetch the transactions
      setActionSplits([...actionSplits]);
    });
  }

  async function onSave(close) {
    const rule = {
      ...defaultRule,
      stage,
      conditionsOp,
      conditions: conditions.map(unparse),
      actions: getUnparsedActions(actionSplits),
    };

    const method = rule.id ? 'rule-update' : 'rule-add';
    const { error, id: newId } = await send(method, rule);

    if (error) {
      if (error.conditionErrors) {
        setConditions(applyErrors(conditions, error.conditionErrors));
      }

      if (error.actionErrors) {
        let usedErrorIdx = 0;
        setActionSplits(
          actionSplits.map(item => ({
            ...item,
            actions: item.actions.map(action => ({
              ...action,
              error: error.actionErrors[usedErrorIdx++] ?? null,
            })),
          })),
        );
      }
    } else {
      // If adding a rule, we got back an id
      if (newId) {
        rule.id = newId;
      }

      originalOnSave?.(rule);
      close();
    }
  }

  const editorStyle = {
    color: theme.pillText,
    backgroundColor: theme.pillBackground,
    borderRadius: 4,
  };

  // Enable editing existing split rules even if the feature has since been disabled.
  const showSplitButton = actionSplits.length > 0;

  return (
    <Modal name="edit-rule">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Rule')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              maxWidth: '100%',
              width: 900,
              height: '80vh',
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: 'auto',
              overflow: 'hidden',
              color: theme.pageTextLight,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 15,
                padding: '0 20px',
              }}
            >
              <Text style={{ marginRight: 15 }}>
                <Trans>Stage of rule:</Trans>
              </Text>

              <Stack direction="row" align="center" spacing={1}>
                <StageButton
                  selected={stage === 'pre'}
                  onSelect={() => onChangeStage('pre')}
                >
                  <Trans>Pre</Trans>
                </StageButton>
                <StageButton
                  selected={stage === null}
                  onSelect={() => onChangeStage(null)}
                >
                  <Trans>Default</Trans>
                </StageButton>
                <StageButton
                  selected={stage === 'post'}
                  onSelect={() => onChangeStage('post')}
                >
                  <Trans>Post</Trans>
                </StageButton>

                <StageInfo />
              </Stack>
            </View>

            <View
              innerRef={scrollableEl}
              style={{
                borderBottom: '1px solid ' + theme.tableBorder,
                padding: 20,
                overflow: 'auto',
                maxHeight: 'calc(100% - 300px)',
              }}
            >
              <View style={{ flexShrink: 0 }}>
                <View style={{ marginBottom: 30 }}>
                  <Text style={{ marginBottom: 15 }}>
                    <Trans>
                      If{' '}
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
                      {{ allOrAny: '' }} of these conditions match:
                    </Trans>
                  </Text>

                  <ConditionsList
                    conditionsOp={conditionsOp}
                    conditions={conditions}
                    editorStyle={editorStyle}
                    isSchedule={isSchedule}
                    onChangeConditions={conds => setConditions(conds)}
                  />
                </View>

                <Text style={{ marginBottom: 15 }}>
                  <Trans>Then apply these actions:</Trans>
                </Text>
                <View style={{ flex: 1 }}>
                  {actionSplits.length === 0 && (
                    <Button
                      style={{ alignSelf: 'flex-start' }}
                      onPress={addInitialAction}
                    >
                      <Trans>Add action</Trans>
                    </Button>
                  )}
                  <Stack spacing={2} data-testid="action-split-list">
                    {actionSplits.map(({ id, actions }, splitIndex) => (
                      <View
                        key={id}
                        nativeStyle={
                          actionSplits.length > 1
                            ? {
                                borderColor: theme.tableBorder,
                                borderWidth: '1px',
                                borderRadius: '5px',
                                padding: '5px',
                              }
                            : {}
                        }
                      >
                        {actionSplits.length > 1 && (
                          <Stack
                            direction="row"
                            justify="space-between"
                            spacing={1}
                          >
                            <Text
                              style={{
                                ...styles.smallText,
                                marginBottom: '10px',
                              }}
                            >
                              {splitIndex === 0
                                ? t('Apply to all')
                                : `${t('Split')} ${splitIndex}`}
                            </Text>
                            {splitIndex && (
                              <Button
                                variant="bare"
                                onPress={() => onRemoveSplit(splitIndex)}
                                style={{
                                  width: 20,
                                  height: 20,
                                }}
                                aria-label={t('Delete split')}
                              >
                                <SvgDelete
                                  style={{
                                    width: 8,
                                    height: 8,
                                    color: 'inherit',
                                  }}
                                />
                              </Button>
                            )}
                          </Stack>
                        )}
                        <Stack spacing={2} data-testid="action-list">
                          {actions.map((action, actionIndex) => (
                            <View key={actionIndex}>
                              <ActionEditor
                                ops={[
                                  'set',
                                  'link-schedule',
                                  'prepend-notes',
                                  'append-notes',
                                ]}
                                action={action}
                                editorStyle={editorStyle}
                                onChange={(name, value) => {
                                  onChangeAction(action, name, value);
                                }}
                                onDelete={() => onRemoveAction(action)}
                                onAdd={() =>
                                  addActionToSplitAfterIndex(
                                    splitIndex,
                                    actionIndex,
                                  )
                                }
                              />
                            </View>
                          ))}
                        </Stack>

                        {actions.length === 0 && (
                          <Button
                            style={{ alignSelf: 'flex-start', marginTop: 5 }}
                            onPress={() =>
                              addActionToSplitAfterIndex(splitIndex, -1)
                            }
                          >
                            <Trans>Add action</Trans>
                          </Button>
                        )}
                      </View>
                    ))}
                  </Stack>
                  {showSplitButton && (
                    <Button
                      style={{ alignSelf: 'flex-start', marginTop: 15 }}
                      onPress={() => {
                        addActionToSplitAfterIndex(actionSplits.length, -1);
                      }}
                      data-testid="add-split-transactions"
                    >
                      {actionSplits.length > 1
                        ? t('Add another split')
                        : t('Split into multiple transactions')}
                    </Button>
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
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: theme.pageTextLight, marginBottom: 0 }}>
                    <Trans>This rule applies to these transactions:</Trans>
                  </Text>

                  <View style={{ flex: 1 }} />
                  <Button
                    isDisabled={selectedInst.items.size === 0}
                    onPress={onApply}
                  >
                    <Trans>Apply actions</Trans> ({selectedInst.items.size})
                  </Button>
                </View>

                <SimpleTransactionsTable
                  transactions={transactions}
                  fields={getTransactionFields(
                    conditions,
                    getActions(actionSplits),
                  )}
                  style={{
                    border: '1px solid ' + theme.tableBorder,
                    borderRadius: '6px 6px 0 0',
                  }}
                />

                <Stack
                  direction="row"
                  justify="flex-end"
                  style={{ marginTop: 20 }}
                >
                  <Button onClick={close}>{t('Cancel')}</Button>
                  <Button variant="primary" onPress={() => onSave(close)}>
                    <Trans>Save</Trans>
                  </Button>
                </Stack>
              </View>
            </SelectedProvider>
          </View>
        </>
      )}
    </Modal>
  );
}
