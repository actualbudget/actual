import React, { useState, useRef, useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';

import {
  parse as parseDate,
  format as formatDate,
  isValid as isDateValid
} from 'date-fns';
import scopeTab from 'react-modal/lib/helpers/scopeTab';

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
  TYPE_INFO
} from 'loot-core/src/shared/rules';
import { titleFirst } from 'loot-core/src/shared/util';
import {
  View,
  Text,
  Tooltip,
  Stack,
  Button,
  Menu,
  CustomSelect
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';
import DeleteIcon from 'loot-design/src/svg/v0/Delete';
import SettingsSliderAlternate from 'loot-design/src/svg/v2/SettingsSliderAlternate';

import { Value } from '../ManageRules';
import GenericInput from '../util/GenericInput';

let filterFields = [
  'date',
  'account',
  'payee',
  'notes',
  'category',
  'amount',
  'cleared'
].map(field => [field, mapField(field)]);

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

function ScopeTab({ children }) {
  let contentRef = useRef();

  function onKeyDown(e) {
    if (e.keyCode === 9) {
      scopeTab(contentRef.current, e);
    }
  }

  useEffect(() => {
    contentRef.current.focus();
  }, []);

  return (
    <div ref={contentRef} tabIndex={-1} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}

function OpButton({ op, selected, style, onClick }) {
  return (
    <Button
      bare
      style={[
        { backgroundColor: colors.n10, marginBottom: 5 },
        style,
        selected && {
          color: 'white',
          '&,:hover,:active': { backgroundColor: colors.b4 }
        }
      ]}
      onClick={onClick}
    >
      {friendlyOp(op)}
    </Button>
  );
}

function ConfigureField({ field, op, value, dispatch, onApply }) {
  let [subfield, setSubfield] = useState(field);
  let inputRef = useRef();
  let prevOp = useRef(null);

  useEffect(() => {
    if (prevOp.current !== op && inputRef.current) {
      inputRef.current.focus();
    }
    prevOp.current = op;
  }, [op]);

  let type = FIELD_TYPES.get(field);
  let ops = TYPE_INFO[type].ops;

  // Month and year fields are quite hacky right now! Figure out how
  // to clean this up later
  if (subfield === 'month' || subfield === 'year') {
    ops = ['is'];
  }

  return (
    <Tooltip
      position="bottom-left"
      style={{ padding: 15 }}
      width={300}
      onClose={() => dispatch({ type: 'close' })}
    >
      <ScopeTab>
        <View style={{ marginBottom: 10 }}>
          {field === 'amount' || field === 'date' ? (
            <CustomSelect
              options={
                field === 'amount'
                  ? [
                      ['amount', 'Amount'],
                      ['amount-inflow', 'Amount (inflow)'],
                      ['amount-outflow', 'Amount (outflow)']
                    ]
                  : field === 'date'
                  ? [
                      ['date', 'Date'],
                      ['month', 'Month'],
                      ['year', 'Year']
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
        </View>

        <Stack
          direction="row"
          align="flex-start"
          spacing={1}
          style={{ flexWrap: 'wrap' }}
        >
          {type === 'boolean'
            ? [
                <OpButton
                  key="true"
                  op="true"
                  selected={value === true}
                  onClick={() => {
                    dispatch({ type: 'set-op', op: 'is' });
                    dispatch({ type: 'set-value', value: true });
                  }}
                />,
                <OpButton
                  key="false"
                  op="false"
                  selected={value === false}
                  onClick={() => {
                    dispatch({ type: 'set-op', op: 'is' });
                    dispatch({ type: 'set-value', value: false });
                  }}
                />
              ]
            : ops.map(currOp => (
                <OpButton
                  key={currOp}
                  op={currOp}
                  selected={currOp === op}
                  onClick={() => dispatch({ type: 'set-op', op: currOp })}
                />
              ))}
        </Stack>

        <form action="#">
          {type !== 'boolean' && (
            <GenericInput
              inputRef={inputRef}
              field={field}
              subfield={subfield}
              type={type === 'id' && op === 'contains' ? 'string' : type}
              value={value}
              multi={op === 'oneOf'}
              style={{ marginTop: 10 }}
              onChange={v => dispatch({ type: 'set-value', value: v })}
            />
          )}

          <View>
            <Button
              primary
              style={{ marginTop: 15 }}
              onClick={e => {
                e.preventDefault();
                onApply({
                  field,
                  op,
                  value,
                  options: subfieldToOptions(field, subfield)
                });
              }}
            >
              Apply
            </Button>
          </View>
        </form>
      </ScopeTab>
    </Tooltip>
  );
}

export function FilterButton({ onApply }) {
  let { dateFormat } = useSelector(state => {
    return {
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy'
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
            value: type === 'boolean' ? true : null
          };
        }
        case 'set-op': {
          let type = FIELD_TYPES.get(state.field);
          let value = state.value;
          if (type === 'id' && action.op === 'contains') {
            // Clear out the value if switching between contains for
            // the id type
            value = null;
          }
          return { ...state, op: action.op, value };
        }
        case 'set-value':
          let { value } = makeValue(action.value, {
            type: FIELD_TYPES.get(state.field)
          });
          return { ...state, value: value };
        case 'close':
          return { fieldsOpen: false, condOpen: false, value: null };
        default:
          throw new Error('Unknown action: ' + action.type);
      }
    },
    { fieldsOpen: false, condOpen: false, field: null, value: null }
  );

  async function onValidateAndApply(cond) {
    cond = unparse({ ...cond, type: FIELD_TYPES.get(cond.field) });

    if (cond.type === 'date' && cond.options) {
      if (cond.options.month) {
        let date = parseDate(
          cond.value,
          getMonthYearFormat(dateFormat),
          new Date()
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

    let { error } = await send('rule-validate', {
      conditions: [cond],
      actions: []
    });

    if (error && error.conditionErrors.length > 0) {
      let field = titleFirst(mapField(cond.field));
      alert(field + ': ' + getFieldError(error.conditionErrors[0]));
    } else {
      onApply(cond);
      dispatch({ type: 'close' });
    }
  }

  return (
    <View>
      <Button bare onClick={() => dispatch({ type: 'select-field' })}>
        <SettingsSliderAlternate
          style={{
            width: 16,
            height: 16,
            color: 'inherit',
            marginRight: 5
          }}
        />{' '}
        Filter
      </Button>
      {state.fieldsOpen && (
        <Tooltip
          position="bottom-left"
          style={{ padding: 0 }}
          onClose={() => dispatch({ type: 'close' })}
        >
          <Menu
            onMenuSelect={name => {
              dispatch({ type: 'configure', field: name });
            }}
            items={filterFields.map(([name, text]) => ({
              name: name,
              text: titleFirst(text)
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

function FilterExpression({
  field: originalField,
  customName,
  op,
  value,
  options,
  stage,
  style,
  onDelete
}) {
  let type = FIELD_TYPES.get(originalField);

  let field = originalField;
  if (type === 'date') {
    if (value.length === 7) {
      field = 'month';
    } else if (value.length === 4) {
      field = 'year';
    }
  }

  return (
    <View
      style={[
        {
          backgroundColor: colors.n10,
          borderRadius: 4,
          flexDirection: 'row',
          alignItems: 'center',
          padding: 5,
          paddingLeft: 10,
          marginBottom: 10,
          marginRight: 10
        },
        style
      ]}
    >
      <div>
        {customName ? (
          <Text style={{ color: colors.p4 }}>{customName}</Text>
        ) : (
          <>
            <Text style={{ color: colors.p4 }}>{mapField(field, options)}</Text>{' '}
            <Text style={{ color: colors.n3 }}>{friendlyOp(op)}</Text>{' '}
            <Value value={value} field={field} inline={true} />
          </>
        )}
      </div>
      <Button bare style={{ marginLeft: 3 }} onClick={onDelete}>
        <DeleteIcon style={{ width: 8, height: 8, color: colors.n4 }} />
      </Button>
    </View>
  );
}

export function AppliedFilters({ filters, editingFilter, onDelete }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 10,
        marginBottom: -5
      }}
    >
      {filters.map((filter, i) => (
        <FilterExpression
          key={i}
          customName={filter.customName}
          field={filter.field}
          op={filter.op}
          value={filter.value}
          options={filter.options}
          editing={editingFilter === filter}
          onDelete={() => onDelete(filter)}
        />
      ))}
    </View>
  );
}
