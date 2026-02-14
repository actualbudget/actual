import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FocusScope } from 'react-aria';
import { Form } from 'react-aria-components';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import {
  format as formatDate,
  isValid as isDateValid,
  parse as parseDate,
} from 'date-fns';

import { send } from 'loot-core/platform/client/connection';
import { getMonthYearFormat } from 'loot-core/shared/months';
import {
  deserializeField,
  FIELD_TYPES,
  getFieldError,
  getValidOps,
  mapField,
  unparse,
} from 'loot-core/shared/rules';
import { titleFirst } from 'loot-core/shared/util';
import type { IntegerAmount } from 'loot-core/shared/util';
import type { RuleConditionEntity } from 'loot-core/types/models';

import { CompactFiltersButton } from './CompactFiltersButton';
import { FiltersButton } from './FiltersButton';
import { OpButton } from './OpButton';
import { PayeeFilter } from './PayeeFilter';
import { subfieldFromFilter } from './subfieldFromFilter';
import { subfieldToOptions } from './subfieldToOptions';
import { updateFilterReducer } from './updateFilterReducer';

import { GenericInput } from '@desktop-client/components/util/GenericInput';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useTransactionFilters } from '@desktop-client/hooks/useTransactionFilters';

type FilterReducerState<T extends RuleConditionEntity> = Pick<
  T,
  'value' | 'op' | 'field'
>;
type FilterReducerAction =
  | { type: 'close' }
  | Parameters<typeof updateFilterReducer>[1];

type AmountInputRef = HTMLInputElement & {
  getCurrentAmount: () => IntegerAmount;
};

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
  'transfer',
].map(field => [field, mapField(field)]);

type ConfigureFieldProps<T extends RuleConditionEntity> =
  FilterReducerState<T> &
    Pick<T, 'options'> & {
      initialSubfield?: string;
      dispatch: (action: FilterReducerAction) => void;
      onApply: (cond: T) => void;
    };

function ConfigureField<T extends RuleConditionEntity>({
  field: initialField,
  initialSubfield = initialField,
  op,
  value,
  dispatch,
  onApply,
}: ConfigureFieldProps<T>) {
  const { t } = useTranslation();
  const format = useFormat();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const field = initialField === 'category_group' ? 'category' : initialField;
  const [subfield, setSubfield] = useState(initialSubfield);
  const inputRef = useRef<AmountInputRef>(null);
  const prevOp = useRef<T['op'] | null>(null);
  const prevSubfield = useRef<string | null>(null);

  useEffect(() => {
    if (prevOp.current !== op && inputRef.current) {
      inputRef.current.focus();
    }
    prevOp.current = op;
  }, [op]);

  useEffect(() => {
    if (prevSubfield.current !== subfield && inputRef.current) {
      inputRef.current.focus();
    }
    prevSubfield.current = subfield;
  }, [subfield]);

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
      typeof value === 'string' &&
      /^\d{4}-\d{2}$/.test(value)
    ) {
      const date = parseDate(value, 'yyyy-MM', new Date());
      if (isDateValid(date)) {
        return formatDate(date, getMonthYearFormat(dateFormat));
      }
    }
    return value;
  }, [value, field, subfield, dateFormat]);

  // For ops that filter based on payeeId, those use PayeeFilter, otherwise we use GenericInput
  const isPayeeIdOp = (op: T['op']) =>
    ['is', 'is not', 'one of', 'not one of'].includes(op);

  const subfieldSelectOptions = (
    field: 'amount' | 'date' | 'category',
  ): Array<readonly [string, string]> => {
    switch (field) {
      case 'amount':
        return [
          ['amount', t('Amount')],
          ['amount-inflow', t('Amount (inflow)')],
          ['amount-outflow', t('Amount (outflow)')],
        ];

      case 'date':
        return [
          ['date', t('Date')],
          ['month', t('Month')],
          ['year', t('Year')],
        ];

      case 'category':
        return [
          ['category', t('Category')],
          ['category_group', t('Category group')],
        ];

      default:
        return [];
    }
  };

  return (
    <FocusScope>
      <View style={{ marginBottom: 10 }}>
        <SpaceBetween style={{ alignItems: 'flex-start' }}>
          {field === 'amount' || field === 'date' || field === 'category' ? (
            <Select
              options={subfieldSelectOptions(field)}
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
        </SpaceBetween>
      </View>

      <View
        style={{
          color: theme.pageTextLight,
          marginBottom: 10,
        }}
      >
        {field === 'saved' && t('Existing filters will be cleared')}
      </View>

      <SpaceBetween
        gap={5}
        style={{ alignItems: 'flex-start', marginBottom: 15 }}
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
            {ops.slice(0, 3).map(currOp => (
              <OpButton
                key={currOp}
                op={currOp}
                isSelected={currOp === op}
                onPress={() => dispatch({ type: 'set-op', op: currOp })}
              />
            ))}
            {ops.slice(3, ops.length).map(currOp => (
              <OpButton
                key={currOp}
                op={currOp}
                isSelected={currOp === op}
                onPress={() => dispatch({ type: 'set-op', op: currOp })}
              />
            ))}
          </>
        )}
      </SpaceBetween>

      <Form
        onSubmit={e => {
          e.preventDefault();

          let submitValue = value;
          let storableField = field;

          if (field === 'amount' && inputRef.current) {
            try {
              if (inputRef.current.getCurrentAmount) {
                submitValue = inputRef.current.getCurrentAmount();
              } else {
                const rawValue = inputRef.current.value || '';
                const parsed = format.fromEdit(rawValue, null);
                if (parsed == null) {
                  submitValue = value; // keep previous if parsing failed
                } else {
                  const opts = subfieldToOptions(field, subfield);
                  submitValue =
                    opts?.inflow || opts?.outflow ? Math.abs(parsed) : parsed;
                }
              }
            } catch {
              submitValue = value;
            }
          }

          if (field === 'category') {
            storableField = subfield;
          }

          // @ts-expect-error - fix me
          onApply({
            field: storableField,
            op,
            value: submitValue,
            options: subfieldToOptions(field, subfield),
          });
        }}
      >
        {type !== 'boolean' && (field !== 'payee' || !isPayeeIdOp(op)) && (
          <GenericInput
            ref={inputRef}
            // @ts-expect-error - fix me
            field={field === 'date' || field === 'category' ? subfield : field}
            // @ts-expect-error - fix me
            type={
              type === 'id' &&
              (op === 'contains' ||
                op === 'matches' ||
                op === 'doesNotContain' ||
                op === 'hasTags')
                ? 'string'
                : type
            }
            numberFormatType="currency"
            // @ts-expect-error - fix me
            value={
              formattedValue ?? (op === 'oneOf' || op === 'notOneOf' ? [] : '')
            }
            // @ts-expect-error - fix me
            multi={op === 'oneOf' || op === 'notOneOf'}
            op={op}
            options={subfieldToOptions(field, subfield)}
            style={{ marginTop: 10 }}
            // oxlint-disable-next-line typescript/no-explicit-any
            onChange={(v: any) => {
              dispatch({ type: 'set-value', value: v });
            }}
          />
        )}

        {field === 'payee' && isPayeeIdOp(op) && (
          <PayeeFilter
            // @ts-expect-error - fix me
            value={formattedValue}
            // @ts-expect-error - fix me
            op={op}
            onChange={v => dispatch({ type: 'set-value', value: v })}
          />
        )}

        <SpaceBetween
          style={{
            marginTop: 15,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1 }} />
          <Button variant="primary" type="submit">
            <Trans>Apply</Trans>
          </Button>
        </SpaceBetween>
      </Form>
    </FocusScope>
  );
}

type FilterButtonProps<T extends RuleConditionEntity> = {
  onApply: (cond: T) => void;
  compact: boolean;
  hover: boolean;
  exclude?: string[];
};

export function FilterButton<T extends RuleConditionEntity>({
  onApply,
  compact,
  hover,
  exclude,
}: FilterButtonProps<T>) {
  const { t } = useTranslation();
  const filters = useTransactionFilters();
  const triggerRef = useRef<HTMLDivElement>(null);
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
    // @ts-expect-error - fix me
    (
      state: FilterReducerState<T> & {
        fieldsOpen: boolean;
        condOpen: boolean;
      },
      action:
        | FilterReducerAction
        | { type: 'select-field' }
        | { type: 'configure'; field: string },
    ) => {
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

  async function onValidateAndApply(cond: T) {
    // @ts-expect-error - fix me
    cond = unparse({ ...cond, type: FIELD_TYPES.get(cond.field) });

    if (cond.type === 'date' && cond.options) {
      if (cond.options.month) {
        const date = parseDate(
          // @ts-expect-error - fix me
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
        // @ts-expect-error - fix me
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
      cond.field === 'saved'
        ? { error: null }
        : await send('rule-validate', {
            conditions: [cond],
            actions: [],
          });

    const saved = filters.find(f => cond.value === f.id);

    if (error && error.conditionErrors.length > 0) {
      const field = titleFirst(mapField(cond.field));
      alert(field + ': ' + getFieldError(error.conditionErrors[0]));
    } else {
      // @ts-expect-error - fix me
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
          items={[
            ...translatedFilterFields
              .filter(f => (exclude ? !exclude.includes(f[0]) : true))
              .sort()
              .map(([name, text]) => ({
                name,
                text: titleFirst(text),
              })),

            Menu.line,

            {
              name: 'saved',
              text: titleFirst(mapField('saved')),
            },
          ]}
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
          // @ts-expect-error - fix me
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

type FilterEditorProps<T extends RuleConditionEntity> = FilterReducerState<T> &
  Pick<T, 'options'> & {
    onSave: (cond: T) => void;
    onClose: () => void;
  };

export function FilterEditor<T extends RuleConditionEntity>({
  field,
  op,
  value,
  options,
  onSave,
  onClose,
}: FilterEditorProps<T>) {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { t } = useTranslation();

  const [state, dispatch] = useReducer(
    (state: FilterReducerState<T>, action: FilterReducerAction) => {
      switch (action.type) {
        case 'close':
          onClose();
          return state;
        default:
          return updateFilterReducer(state, action);
      }
    },
    { field, op, value },
  );

  return (
    <ConfigureField
      field={state.field}
      initialSubfield={subfieldFromFilter({ field, options, value })}
      op={state.op}
      value={state.value}
      options={options}
      dispatch={dispatch}
      onApply={cond => {
        // @ts-expect-error - fix me
        cond = unparse({ ...cond, type: FIELD_TYPES.get(cond.field) });

        if (cond.type === 'date' && cond.options) {
          if (
            cond.options.month &&
            typeof cond.value === 'string' &&
            !/\d{4}-\d{2}/.test(cond.value)
          ) {
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
            // @ts-expect-error - fix me
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
