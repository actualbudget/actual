import React, { useState, useRef, useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';

import { FocusScope } from '@react-aria/focus';
import {
  parse as parseDate,
  format as formatDate,
  isValid as isDateValid,
} from 'date-fns';

import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import { send } from 'loot-core/src/platform/client/fetch';
import { getMonthYearFormat } from 'loot-core/src/shared/months';
import {
  mapField,
  friendlyOp,
  deserializeField,
  getFieldError,
  unparse,
  makeValue,
  FIELD_TYPES,
  TYPE_INFO,
} from 'loot-core/src/shared/rules';
import { titleFirst } from 'loot-core/src/shared/util';

import DeleteIcon from '../../icons/v0/Delete';
import SettingsSliderAlternate from '../../icons/v2/SettingsSliderAlternate';
import { theme } from '../../style';
import Button from '../common/Button';
import Menu from '../common/Menu';
import Select from '../common/Select';
import Stack from '../common/Stack';
import Text from '../common/Text';
import View from '../common/View';
import Value from '../rules/Value';
import { Tooltip } from '../tooltips';
import GenericInput from '../util/GenericInput';

import { CondOpMenu } from './SavedFilters';

let filterFields = [
  'date',
  'account',
  'payee',
  'notes',
  'category',
  'amount',
  'cleared',
  'saved',
].map(field => [field, mapField(field)]);

function subfieldFromFilter({ field, options, value }) {
  if (field === 'date') {
    if (value.length === 7) {
      return 'month';
    } else if (value.length === 4) {
      return 'year';
    }
  } else if (field === 'amount') {
    if (options && options.inflow) {
      return 'amount-inflow';
    } else if (options && options.outflow) {
      return 'amount-outflow';
    }
  }
  return field;
}

function subfieldToOptions(field, subfield) {
  switch (field) {
    case 'amount':
      switch (subfield) {
        case 'amount-inflow':
          return { inflow: true };
        case 'amount-outflow':
          return { outflow: true };
        default:
          return null;
      }
    case 'date':
      switch (subfield) {
        case 'month':
          return { month: true };
        case 'year':
          return { year: true };
        default:
          return null;
      }
    default:
      return null;
  }
}

function OpButton({ op, selected, style, onClick }) {
  return (
    <Button
      type="bare"
      style={{
        backgroundColor: theme.altbuttonMenuBackground,
        marginBottom: 5,
        ...style,
        ...(selected && {
          color: theme.buttonNormalSelectedText,
          '&,:hover,:active': {
            backgroundColor: theme.buttonNormalSelectedBackground,
            color: theme.buttonNormalSelectedText,
          },
        }),
      }}
      onClick={onClick}
    >
      {friendlyOp(op)}
    </Button>
  );
}

function updateFilterReducer(state, action) {
  switch (action.type) {
    case 'set-op': {
      let type = FIELD_TYPES.get(state.field);
      let value = state.value;
      if (
        (type === 'id' || type === 'string') &&
        (action.op === 'contains' ||
          action.op === 'is' ||
          action.op === 'doesNotContain' ||
          action.op === 'isNot')
      ) {
        // Clear out the value if switching between contains or
        // is/oneof for the id or string type
        value = null;
      }
      return { ...state, op: action.op, value };
    }
    case 'set-value': {
      let { value } = makeValue(action.value, {
        type: FIELD_TYPES.get(state.field),
      });
      return { ...state, value: value };
    }
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

function ConfigureField({
  field,
  initialSubfield = field,
  op,
  value,
  dispatch,
  onApply,
}) {
  let [subfield, setSubfield] = useState(initialSubfield);
  let inputRef = useRef();
  let prevOp = useRef(null);

  useEffect(() => {
    if (prevOp.current !== op && inputRef.current) {
      inputRef.current.focus();
    }
    prevOp.current = op;
  }, [op]);

  let type = FIELD_TYPES.get(field);
  let ops = TYPE_INFO[type].ops.filter(op => op !== 'isbetween');

  // Month and year fields are quite hacky right now! Figure out how
  // to clean this up later
  if (subfield === 'month' || subfield === 'year') {
    ops = ['is'];
  }

  return (
    <Tooltip
      position="bottom-left"
      style={{ padding: 15, color: theme.altmenuItemTextHeader }}
      width={275}
      onClose={() => dispatch({ type: 'close' })}
      data-testid="filters-menu-tooltip"
    >
      <FocusScope>
        <View style={{ marginBottom: 10 }}>
          <Stack direction="row" align="flex-start">
            {field === 'amount' || field === 'date' ? (
              <Select
                options={
                  field === 'amount'
                    ? [
                        ['amount', 'Amount'],
                        ['amount-inflow', 'Amount (inflow)'],
                        ['amount-outflow', 'Amount (outflow)'],
                      ]
                    : field === 'date'
                    ? [
                        ['date', 'Date'],
                        ['month', 'Month'],
                        ['year', 'Year'],
                      ]
                    : null
                }
                value={subfield}
                onChange={sub => {
                  setSubfield(sub);

                  if (sub === 'month' || sub === 'year') {
                    dispatch({ type: 'set-op', op: 'is' });
                  }
                }}
                style={{ borderWidth: 1 }}
              />
            ) : (
              titleFirst(mapField(field))
            )}
            <View style={{ flex: 1 }} />
          </Stack>
        </View>

        <View
          style={{
            color: theme.pageTextLight,
            marginBottom: 10,
          }}
        >
          {field === 'saved' && 'Existing filters will be cleared'}
        </View>

        <Stack
          direction="row"
          align="flex-start"
          spacing={1}
          style={{ flexWrap: 'wrap' }}
        >
          {type === 'boolean' ? (
            <>
              <OpButton
                key="true"
                op="true"
                selected={value === true}
                onClick={() => {
                  dispatch({ type: 'set-op', op: 'is' });
                  dispatch({ type: 'set-value', value: true });
                }}
              />
              <OpButton
                key="false"
                op="false"
                selected={value === false}
                onClick={() => {
                  dispatch({ type: 'set-op', op: 'is' });
                  dispatch({ type: 'set-value', value: false });
                }}
              />
            </>
          ) : (
            <>
              <Stack
                direction="row"
                align="flex-start"
                spacing={1}
                style={{ flexWrap: 'wrap' }}
              >
                {ops.slice(0, 3).map(currOp => (
                  <OpButton
                    key={currOp}
                    op={currOp}
                    selected={currOp === op}
                    onClick={() => dispatch({ type: 'set-op', op: currOp })}
                  />
                ))}
              </Stack>
              <Stack
                direction="row"
                align="flex-start"
                spacing={1}
                style={{ flexWrap: 'wrap' }}
              >
                {ops.slice(3, ops.length).map(currOp => (
                  <OpButton
                    key={currOp}
                    op={currOp}
                    selected={currOp === op}
                    onClick={() => dispatch({ type: 'set-op', op: currOp })}
                  />
                ))}
              </Stack>
            </>
          )}
        </Stack>

        <form action="#">
          {type !== 'boolean' && (
            <GenericInput
              inputRef={inputRef}
              field={field}
              subfield={subfield}
              type={
                type === 'id' && (op === 'contains' || op === 'doesNotContain')
                  ? 'string'
                  : type
              }
              value={value}
              multi={op === 'oneOf' || op === 'notOneOf'}
              style={{ marginTop: 10 }}
              onChange={v => dispatch({ type: 'set-value', value: v })}
            />
          )}

          <Stack
            direction="row"
            justify="flex-end"
            align="center"
            style={{ marginTop: 15 }}
          >
            <View style={{ flex: 1 }} />
            <Button
              type="primary"
              onClick={e => {
                e.preventDefault();
                onApply({
                  field,
                  op,
                  value,
                  options: subfieldToOptions(field, subfield),
                });
              }}
            >
              Apply
            </Button>
          </Stack>
        </form>
      </FocusScope>
    </Tooltip>
  );
}

export function FilterButton({ onApply }) {
  let filters = useFilters();

  let { dateFormat } = useSelector(state => {
    return {
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    };
  });

  let [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'select-field':
          return { ...state, fieldsOpen: true, condOpen: false };
        case 'configure': {
          let { field } = deserializeField(action.field);
          let type = FIELD_TYPES.get(field);
          let ops = TYPE_INFO[type].ops;
          return {
            ...state,
            fieldsOpen: false,
            condOpen: true,
            field: action.field,
            op: ops[0],
            value: type === 'boolean' ? true : null,
          };
        }
        case 'close':
          return { fieldsOpen: false, condOpen: false, value: null };
        default:
          return updateFilterReducer(state, action);
      }
    },
    { fieldsOpen: false, condOpen: false, field: null, value: null },
  );

  async function onValidateAndApply(cond) {
    cond = unparse({ ...cond, type: FIELD_TYPES.get(cond.field) });

    if (cond.type === 'date' && cond.options) {
      if (cond.options.month) {
        let date = parseDate(
          cond.value,
          getMonthYearFormat(dateFormat),
          new Date(),
        );
        if (isDateValid(date)) {
          cond.value = formatDate(date, 'yyyy-MM');
        } else {
          alert('Invalid date format');
          return;
        }
      } else if (cond.options.year) {
        let date = parseDate(cond.value, 'yyyy', new Date());
        if (isDateValid(date)) {
          cond.value = formatDate(date, 'yyyy');
        } else {
          alert('Invalid date format');
          return;
        }
      }
    }

    let { error } =
      cond.field !== 'saved' &&
      (await send('rule-validate', {
        conditions: [cond],
        actions: [],
      }));

    let saved = filters.find(f => cond.value === f.id);

    if (error && error.conditionErrors.length > 0) {
      let field = titleFirst(mapField(cond.field));
      alert(field + ': ' + getFieldError(error.conditionErrors[0]));
    } else {
      onApply(saved ? saved : cond);
      dispatch({ type: 'close' });
    }
  }

  return (
    <View>
      <Button type="bare" onClick={() => dispatch({ type: 'select-field' })}>
        <SettingsSliderAlternate
          style={{ width: 16, height: 16, marginRight: 5 }}
        />{' '}
        Filter
      </Button>
      {state.fieldsOpen && (
        <Tooltip
          position="bottom-left"
          style={{ padding: 0 }}
          onClose={() => dispatch({ type: 'close' })}
          data-testid="filters-select-tooltip"
        >
          <Menu
            onMenuSelect={name => {
              dispatch({ type: 'configure', field: name });
            }}
            items={filterFields.map(([name, text]) => ({
              name: name,
              text: titleFirst(text),
            }))}
          />
        </Tooltip>
      )}
      {state.condOpen && (
        <ConfigureField
          field={state.field}
          op={state.op}
          value={state.value}
          dispatch={dispatch}
          onApply={onValidateAndApply}
        />
      )}
    </View>
  );
}

function FilterEditor({ field, op, value, options, onSave, onClose }) {
  let [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'close':
          onClose();
          return state;
        default:
          return updateFilterReducer(state, action);
      }
    },
    { field, op, value, options },
  );

  return (
    <ConfigureField
      field={state.field}
      initialSubfield={subfieldFromFilter({ field, options, value })}
      op={state.op}
      value={state.value}
      options={state.options}
      dispatch={dispatch}
      onApply={cond => {
        onSave(cond);
        onClose();
      }}
    />
  );
}

function FilterExpression({
  field: originalField,
  customName,
  op,
  value,
  options,
  stage,
  style,
  onChange,
  onDelete,
}) {
  let [editing, setEditing] = useState(false);

  let field = subfieldFromFilter({ field: originalField, value });

  return (
    <View
      style={{
        backgroundColor: theme.pillBackground,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        marginTop: 10,
        ...style,
      }}
    >
      <Button
        type="bare"
        disabled={customName != null}
        onClick={() => setEditing(true)}
        style={{ marginRight: -7 }}
      >
        <div style={{ paddingBlock: 1, paddingLeft: 5, paddingRight: 2 }}>
          {customName ? (
            <Text style={{ color: theme.pageTextPositive }}>{customName}</Text>
          ) : (
            <>
              <Text style={{ color: theme.pageTextPositive }}>
                {mapField(field, options)}
              </Text>{' '}
              <Text>{friendlyOp(op, null)}</Text>{' '}
              <Value
                value={value}
                field={field}
                inline={true}
                valueIsRaw={op === 'contains' || op === 'doesNotContain'}
              />
            </>
          )}
        </div>
      </Button>
      <Button type="bare" onClick={onDelete} aria-label="Delete filter">
        <DeleteIcon
          style={{
            width: 8,
            height: 8,
            margin: 5,
            marginLeft: 3,
          }}
        />
      </Button>
      {editing && (
        <FilterEditor
          field={originalField}
          customName={customName}
          op={op}
          value={value}
          options={options}
          stage={stage}
          onSave={onChange}
          onClose={() => setEditing(false)}
        />
      )}
    </View>
  );
}

export function AppliedFilters({
  filters,
  editingFilter,
  onUpdate,
  onDelete,
  conditionsOp,
  onCondOpChange,
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      <CondOpMenu
        conditionsOp={conditionsOp}
        onCondOpChange={onCondOpChange}
        filters={filters}
      />
      {filters.map((filter, i) => (
        <FilterExpression
          key={i}
          customName={filter.customName}
          field={filter.field}
          op={filter.op}
          value={filter.value}
          options={filter.options}
          editing={editingFilter === filter}
          onChange={newFilter => onUpdate(filter, newFilter)}
          onDelete={() => onDelete(filter)}
        />
      ))}
    </View>
  );
}
