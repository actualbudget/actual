import React, { useState, useRef, useEffect, useReducer, useMemo } from 'react';
import { FocusScope } from 'react-aria';
import { Form } from 'react-aria-components';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Select } from '@actual-app/components/select';
import { Stack } from '@actual-app/components/stack';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import {
  parse as parseDate,
  format as formatDate,
  isValid as isDateValid,
} from 'date-fns';

import { send } from 'loot-core/platform/client/fetch';
import { getMonthYearFormat } from 'loot-core/shared/months';
import {
  mapField,
  deserializeField,
  getFieldError,
  unparse,
  FIELD_TYPES,
  getValidOps,
} from 'loot-core/shared/rules';
import { titleFirst } from 'loot-core/shared/util';

import { CompactFiltersButton } from './CompactFiltersButton';
import { FiltersButton } from './FiltersButton';
import { OpButton } from './OpButton';
import { subfieldFromFilter } from './subfieldFromFilter';
import { subfieldToOptions } from './subfieldToOptions';
import { updateFilterReducer } from './updateFilterReducer';

import { GenericInput } from '@desktop-client/components/util/GenericInput';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useTransactionFilters } from '@desktop-client/hooks/useTransactionFilters';

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
  'transfer',
].map(field => [field, mapField(field)]);

function ConfigureField({
  field,
  initialSubfield = field,
  op,
  value,
  dispatch,
  onApply,
}) {
  const { t } = useTranslation();
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
  let ops = getValidOps(field).filter(op => op !== 'isbetween');

  // Month and year fields are quite hacky right now! Figure out how
  // to clean this up later
  if (subfield === 'month' || subfield === 'year') {
    ops = ['is'];
  }

  const formattedValue = useMemo(() => {
    if (
      field === 'date' &&
      subfield === 'month' &&
      /^\d{4}-\d{2}$/.test(value)
    ) {
      const [year, month] = value.split('-');
      return `${month}/${year}`;
    }
    return value;
  }, [value, field, subfield]);

  return (
    <FocusScope>
      <View style={{ marginBottom: 10 }}>
        <Stack direction="row" align="flex-start">
          {field === 'amount' || field === 'date' ? (
            <Select
              options={
                field === 'amount'
                  ? [
                      ['amount', t('Amount')],
                      ['amount-inflow', t('Amount (inflow)')],
                      ['amount-outflow', t('Amount (outflow)')],
                    ]
                  : field === 'date'
                    ? [
                        ['date', t('Date')],
                        ['month', t('Month')],
                        ['year', t('Year')],
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
            />
          ) : (
            <View
              style={{
                flexDirection: 'row',
                width: '100%',
                alignItems: 'center',
                padding: 0,
              }}
            >
              <View style={{ flexGrow: 1 }}>{titleFirst(mapField(field))}</View>
            </View>
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
        {field === 'saved' && t('Existing filters will be cleared')}
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
              isSelected={value === true}
              onPress={() => {
                dispatch({ type: 'set-op', op: 'is' });
                dispatch({ type: 'set-value', value: true });
              }}
            />
            <OpButton
              key="false"
              op="false"
              isSelected={value === false}
              onPress={() => {
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
                  isSelected={currOp === op}
                  onPress={() => dispatch({ type: 'set-op', op: currOp })}
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
                  isSelected={currOp === op}
                  onPress={() => dispatch({ type: 'set-op', op: currOp })}
                />
              ))}
            </Stack>
          </>
        )}
      </Stack>

      <Form
        onSubmit={e => {
          e.preventDefault();
          onApply({
            field,
            op,
            value,
            options: subfieldToOptions(field, subfield),
          });
        }}
      >
        {type !== 'boolean' && (
          <GenericInput
            ref={inputRef}
            field={field}
            subfield={subfield}
            type={
              type === 'id' &&
              (op === 'contains' ||
                op === 'matches' ||
                op === 'doesNotContain' ||
                op === 'hasTags')
                ? 'string'
                : type
            }
            value={formattedValue}
            multi={op === 'oneOf' || op === 'notOneOf'}
            op={op}
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
          <Button variant="primary" type="submit">
            <Trans>Apply</Trans>
          </Button>
        </Stack>
      </Form>
    </FocusScope>
  );
}

export function FilterButton({ onApply, compact, hover, exclude }) {
  const { t } = useTranslation();
  const filters = useTransactionFilters();
  const triggerRef = useRef(null);

  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const translatedFilterFields = useMemo(() => {
    const retValue = [...filterFields];

    if (retValue && retValue.length > 0) {
      retValue.forEach(field => {
        field[1] = mapField(field[0]);
      });
    }

    return retValue;
  }, []);

  const [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'select-field':
          return { ...state, fieldsOpen: true, condOpen: false };
        case 'configure': {
          const { field } = deserializeField(action.field);
          const type = FIELD_TYPES.get(field);
          const ops = getValidOps(field);
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
          alert(t('Invalid date format'));
          return;
        }
      } else if (cond.options.year) {
        const date = parseDate(cond.value, 'yyyy', new Date());
        if (isDateValid(date)) {
          cond.value = formatDate(date, 'yyyy');
        } else {
          alert(t('Invalid date format'));
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
  useHotkeys('f', () => dispatch({ type: 'select-field' }), {
    scopes: ['app'],
  });

  return (
    <View>
      <View ref={triggerRef}>
        <Tooltip
          style={{
            ...styles.tooltip,
            lineHeight: 1.5,
            padding: '6px 10px',
          }}
          content={
            <Text>
              <Trans>Filters</Trans>
            </Text>
          }
          placement="bottom start"
          triggerProps={{
            isDisabled: !hover,
          }}
        >
          {compact ? (
            <CompactFiltersButton
              onPress={() => dispatch({ type: 'select-field' })}
            />
          ) : (
            <FiltersButton onPress={() => dispatch({ type: 'select-field' })} />
          )}
        </Tooltip>
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
          items={translatedFilterFields
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
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { t } = useTranslation();

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

        if (cond.type === 'date' && cond.options) {
          if (cond.options.month && !/\d{4}-\d{2}/.test(cond.value)) {
            const date = parseDate(
              cond.value,
              getMonthYearFormat(dateFormat),
              new Date(),
            );
            if (isDateValid(date)) {
              cond.value = formatDate(date, 'yyyy-MM');
            } else {
              alert(t('Invalid date format'));
              return;
            }
          } else if (cond.options.year) {
            const date = parseDate(cond.value, 'yyyy', new Date());
            if (isDateValid(date)) {
              cond.value = formatDate(date, 'yyyy');
            } else {
              alert(t('Invalid date format'));
              return;
            }
          }
        }

        onSave(cond);
        onClose();
      }}
    />
  );
}
