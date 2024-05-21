import React, { useState, useRef, useEffect, useReducer } from 'react';

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
  deserializeField,
  getFieldError,
  unparse,
  FIELD_TYPES,
  TYPE_INFO,
} from 'loot-core/src/shared/rules';
import { titleFirst } from 'loot-core/src/shared/util';

import { useDateFormat } from '../../hooks/useDateFormat';
import { theme } from '../../style';
import { Button } from '../common/Button';
import { HoverTarget } from '../common/HoverTarget';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';
import { GenericInput } from '../util/GenericInput';

import { CompactFiltersButton } from './CompactFiltersButton';
import { FiltersButton } from './FiltersButton';
import { OpButton } from './OpButton';
import { subfieldFromFilter } from './subfieldFromFilter';
import { subfieldToOptions } from './subfieldToOptions';
import { updateFilterReducer } from './updateFilterReducer';

let isDatepickerClick = false;

const filterFields = [
  'date',
  'account',
  'payee',
  'notes',
  'category',
  'amount',
  'cleared',
  'reconciled',
  'saved',
].map(field => [field, mapField(field)]);

function ConfigureField({
  field,
  initialSubfield = field,
  op,
  value,
  dispatch,
  onApply,
}) {
  const [subfield, setSubfield] = useState(initialSubfield);
  const inputRef = useRef();
  const prevOp = useRef(null);

  useEffect(() => {
    if (prevOp.current !== op && inputRef.current) {
      inputRef.current.focus();
    }
    prevOp.current = op;
  }, [op]);

  const type = FIELD_TYPES.get(field);
  let ops = TYPE_INFO[type].ops.filter(op => op !== 'isbetween');

  // Month and year fields are quite hacky right now! Figure out how
  // to clean this up later
  if (subfield === 'month' || subfield === 'year') {
    ops = ['is'];
  }

  return (
    <FocusScope>
      <View style={{ marginBottom: 10 }}>
        <Stack direction="row" align="flex-start">
          {field === 'amount' || field === 'date' ? (
            <Select
              bare
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
            onChange={v => {
              dispatch({ type: 'set-value', value: v });
            }}
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
  );
}

export function FilterButton({ onApply, compact, hover, exclude }) {
  const filters = useFilters();
  const triggerRef = useRef(null);

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'select-field':
          return { ...state, fieldsOpen: true, condOpen: false };
        case 'configure': {
          const { field } = deserializeField(action.field);
          const type = FIELD_TYPES.get(field);
          const ops = TYPE_INFO[type].ops;
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
        const date = parseDate(
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
        const date = parseDate(cond.value, 'yyyy', new Date());
        if (isDateValid(date)) {
          cond.value = formatDate(date, 'yyyy');
        } else {
          alert('Invalid date format');
          return;
        }
      }
    }

    const { error } =
      cond.field !== 'saved' &&
      (await send('rule-validate', {
        conditions: [cond],
        actions: [],
      }));

    const saved = filters.find(f => cond.value === f.id);

    if (error && error.conditionErrors.length > 0) {
      const field = titleFirst(mapField(cond.field));
      alert(field + ': ' + getFieldError(error.conditionErrors[0]));
    } else {
      onApply(saved ? saved : cond);
      dispatch({ type: 'close' });
    }
  }

  return (
    <View>
      <View ref={triggerRef}>
        <HoverTarget
          style={{ flexShrink: 0 }}
          renderContent={() =>
            hover && (
              <Tooltip
                position="bottom-left"
                style={{
                  lineHeight: 1.5,
                  padding: '6px 10px',
                  backgroundColor: theme.menuBackground,
                  color: theme.menuItemText,
                }}
              >
                <Text>Filters</Text>
              </Tooltip>
            )
          }
        >
          {compact ? (
            <CompactFiltersButton
              onClick={() => dispatch({ type: 'select-field' })}
            />
          ) : (
            <FiltersButton onClick={() => dispatch({ type: 'select-field' })} />
          )}
        </HoverTarget>
      </View>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={state.fieldsOpen}
        onOpenChange={() => dispatch({ type: 'close' })}
        data-testid="filters-select-tooltip"
      >
        <Menu
          onMenuSelect={name => {
            dispatch({ type: 'configure', field: name });
          }}
          items={filterFields
            .filter(f => (exclude ? !exclude.includes(f[0]) : true))
            .sort()
            .map(([name, text]) => ({
              name,
              text: titleFirst(text),
            }))}
        />
      </Popover>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={state.condOpen}
        onOpenChange={() => {
          dispatch({ type: 'close' });
        }}
        shouldCloseOnInteractOutside={element => {
          // Datepicker selections for some reason register 2x clicks
          // We want to keep the popover open after selecting a date.
          // So we ignore the "close" event on selection + the subsequent event.
          if (element.dataset.pikaYear) {
            isDatepickerClick = true;
            return false;
          }
          if (isDatepickerClick) {
            isDatepickerClick = false;
            return false;
          }

          return true;
        }}
        style={{ width: 275, padding: 15, color: theme.menuItemText }}
        data-testid="filters-menu-tooltip"
      >
        {state.field && (
          <ConfigureField
            field={state.field}
            op={state.op}
            value={state.value}
            dispatch={dispatch}
            onApply={onValidateAndApply}
          />
        )}
      </Popover>
    </View>
  );
}

export function FilterEditor({ field, op, value, options, onSave, onClose }) {
  const [state, dispatch] = useReducer(
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
        cond = unparse({ ...cond, type: FIELD_TYPES.get(cond.field) });
        onSave(cond);
        onClose();
      }}
    />
  );
}
