import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
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
import { send } from '@actual-app/core/platform/client/connection';
import { getMonthYearFormat } from '@actual-app/core/shared/months';
import {
  deserializeField,
  FIELD_TYPES,
  getFieldError,
  getValidOps,
  mapField,
  unparse,
} from '@actual-app/core/shared/rules';
import { titleFirst } from '@actual-app/core/shared/util';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type { RuleConditionEntity } from '@actual-app/core/types/models';
import {
  format as formatDate,
  isValid as isDateValid,
  parse as parseDate,
} from 'date-fns';

import { GenericInput } from '#components/util/GenericInput';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { usePayees } from '#hooks/usePayees';
import { useTransactionFilters } from '#hooks/useTransactionFilters';

import { CompactFiltersButton } from './CompactFiltersButton';
import { FiltersButton } from './FiltersButton';
import { OpButton } from './OpButton';
import { PayeeFilter } from './PayeeFilter';
import { subfieldFromFilter } from './subfieldFromFilter';
import { subfieldToOptions } from './subfieldToOptions';
import { updateFilterReducer } from './updateFilterReducer';

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
  const accounts = useAccounts();
  const categories = useCategories();
  const payees = usePayees();
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

  // For ops that filter based on IDs
  const isIdOp = (op: T['op']) =>
    ['is', 'isNot', 'oneOf', 'notOneOf'].includes(op);
  // For ops that use exact matching with a single stored ID value
  const isSingleIdOp = (op: T['op']) => ['is', 'isNot'].includes(op);
  // For ops that use exact matching with multiple stored ID values
  const isMultiIdOp = (op: T['op']) => ['oneOf', 'notOneOf'].includes(op);
  // For ops that use text matching and expect a string input
  const isTextOp = (op: T['op']) =>
    ['contains', 'matches', 'doesNotContain'].includes(op);
  // For account ops that do not use an input value but should preserve the current value in state
  const isNoValueAccountOp = (op: T['op']) =>
    ['onBudget', 'offBudget'].includes(op);

  // Convert stored ID value into text
  const resolveIdToText = (field: string, subfield: string, value: unknown) => {
    if (typeof value !== 'string') {
      return '';
    }
    if (field === 'account') {
      const account = accounts.data?.find(account => account.id === value);
      return account?.name ?? '';
    }
    if (field === 'payee') {
      const payee = payees.data?.find(payee => payee.id === value);
      return payee?.name ?? '';
    }
    if (field === 'category' && subfield === 'category_group') {
      const group = categories.data?.grouped.find(group => group.id === value);
      return group?.name ?? '';
    }
    if (field === 'category' && subfield === 'category') {
      for (const group of categories.data?.grouped || []) {
        const category = group.categories?.find(
          category => category.id === value,
        );
        if (category) {
          return category.name;
        }
      }
    }
    return '';
  };

  // Convert text into stored ID value
  const resolveTextToId = (field: string, subfield: string, value: unknown) => {
    if (typeof value !== 'string') {
      return null;
    }
    if (field === 'account') {
      const matches =
        accounts.data?.filter(account => account.name === value) ?? [];
      return matches.length === 1 ? matches[0].id : null;
    }
    if (field === 'payee') {
      const matches = payees.data?.filter(payee => payee.name === value) ?? [];
      return matches.length === 1 ? matches[0].id : null;
    }
    if (field === 'category' && subfield === 'category_group') {
      const matches =
        categories.data?.grouped.filter(group => group.name === value) ?? [];
      return matches.length === 1 ? matches[0].id : null;
    }
    if (field === 'category' && subfield === 'category') {
      const matches = [];
      for (const group of categories.data?.grouped || []) {
        for (const category of group.categories || []) {
          if (category.name === value) {
            matches.push(category);
          }
        }
      }
      return matches.length === 1 ? matches[0].id : null;
    }
    return null;
  };

  const isIdField =
    field === 'account' || field === 'payee' || field === 'category';

  // Converting values when switching between ops is a bit tricky, so we have some specific rules:
  const setOp = (nextOp: T['op']) => {
    // Single ID -> Text: Convert stored ID to text with one to one mapping
    if (isIdField && isSingleIdOp(op) && isTextOp(nextOp)) {
      dispatch({
        type: 'set-value',
        value: resolveIdToText(field, subfield, value),
      });
    }
    // Text -> Single ID: Only convert if there is a single exact match
    if (isIdField && isTextOp(op) && isSingleIdOp(nextOp)) {
      const resolvedValue = resolveTextToId(field, subfield, value);
      if (resolvedValue) {
        dispatch({
          type: 'set-value',
          value: resolvedValue,
        });
      }
    }
    // Multi ID -> Text: If there is exactly one selected ID, convert it to text; otherwise clear the value
    if (isIdField && isMultiIdOp(op) && isTextOp(nextOp)) {
      if (Array.isArray(value) && value.length === 1) {
        dispatch({
          type: 'set-value',
          value: resolveIdToText(field, subfield, value[0]) || '',
        });
      } else {
        dispatch({
          type: 'set-value',
          value: '',
        });
      }
    }
    // Text -> Multi ID: Only convert if there is a single exact match and wrap in array
    if (isIdField && isTextOp(op) && isMultiIdOp(nextOp)) {
      const resolvedValue = resolveTextToId(field, subfield, value);
      if (resolvedValue) {
        dispatch({
          type: 'set-value',
          value: resolvedValue ? [resolvedValue] : [],
        });
      }
    }
    // No-value Account -> Text: Preserve the old value while the no-value op is selected,
    // then convert when switching back to text
    if (field === 'account' && isNoValueAccountOp(op) && isTextOp(nextOp)) {
      if (Array.isArray(value)) {
        dispatch({
          type: 'set-value',
          value:
            value.length === 1
              ? resolveIdToText(field, subfield, value[0]) || ''
              : '',
        });
      } else {
        dispatch({
          type: 'set-value',
          value: resolveIdToText(field, subfield, value) || '',
        });
      }
    }
    // No-value Account -> Single-ID: If preserved value is text, resolve to an ID;
    // If it is already a single ID string, keep as-is
    if (field === 'account' && isNoValueAccountOp(op) && isSingleIdOp(nextOp)) {
      if (typeof value === 'string') {
        const resolvedValue = resolveTextToId(field, subfield, value);
        dispatch({
          type: 'set-value',
          value: resolvedValue || value,
        });
      } else {
        dispatch({
          type: 'set-value',
          value: '',
        });
      }
    }
    // No-value Account -> Multi-ID: If the preserved value is text, resolve to a single ID and wrap;
    // if the preserved value is already a single ID string, wrap it directly;
    // otherwise clear
    if (field === 'account' && isNoValueAccountOp(op) && isMultiIdOp(nextOp)) {
      if (typeof value === 'string') {
        const resolvedValue = resolveTextToId(field, subfield, value);

        dispatch({
          type: 'set-value',
          value: resolvedValue ? [resolvedValue] : [value],
        });
      } else {
        dispatch({
          type: 'set-value',
          value: [],
        });
      }
    }
    dispatch({ type: 'set-op', op: nextOp });
  };

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
                onPress={() => setOp(currOp)}
              />
            ))}
            {ops.slice(3, ops.length).map(currOp => (
              <OpButton
                key={currOp}
                op={currOp}
                isSelected={currOp === op}
                onPress={() => setOp(currOp)}
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
        {type !== 'boolean' &&
          (field !== 'payee' || !isIdOp(op)) &&
          (field !== 'account' || !isNoValueAccountOp(op)) && (
            <GenericInput
              ref={inputRef}
              // @ts-expect-error - fix me
              field={
                field === 'date' || field === 'category' ? subfield : field
              }
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
                formattedValue ??
                (op === 'oneOf' || op === 'notOneOf' ? [] : '')
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

        {field === 'payee' && isIdOp(op) && (
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

/**
 * Props for the shared report filter picker.
 * Note: the `include` and `exclude` props only control which fields are shown in the picker, they do not limit the fields that can be applied as filters. Additionally, if both `include` and `exclude` are provided, `include` acts as the allowlist before `exclude` is applied.
 */
type FilterButtonProps<T extends RuleConditionEntity> = {
  onApply: (cond: T) => void;
  compact: boolean;
  hover: boolean;
  /** Fields hidden from the picker unless allowed by `include`. */
  exclude?: string[];
  /** If both are provided, `include` acts as the allowlist before `exclude` is applied. */
  include?: string[];
};

/**
 * Returns whether a filter field should be shown in the picker.
 *
 * If both `include` and `exclude` are provided, `include` acts as the
 * allowlist before `exclude` is applied.
 */
function shouldShowFilterField(
  field: string,
  include?: string[],
  exclude?: string[],
) {
  if (include && !include.includes(field)) {
    return false;
  }

  return exclude ? !exclude.includes(field) : true;
}

/**
 * Shared filter picker used by reports to choose and apply filter conditions.
 */
export function FilterButton<T extends RuleConditionEntity>({
  onApply,
  compact,
  hover,
  exclude,
  include,
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

  const visibleFilterFields = translatedFilterFields
    .filter(([field]) => shouldShowFilterField(field, include, exclude))
    .sort((a, b) => a[0].localeCompare(b[0]));

  const filterMenuItems: ComponentProps<typeof Menu>['items'] =
    visibleFilterFields.map(([name, text]) => ({
      name,
      text: titleFirst(text),
    }));

  if (shouldShowFilterField('saved', include, exclude)) {
    filterMenuItems.push(Menu.line);
    filterMenuItems.push({
      name: 'saved',
      text: titleFirst(mapField('saved')),
    });
  }

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
            dispatch({ type: 'configure', field: name as string });
          }}
          items={filterMenuItems}
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

          if (
            element instanceof HTMLElement &&
            (element.closest('[data-testid="account-autocomplete-modal"]') ||
              element.closest('[data-testid="payee-autocomplete-modal"]') ||
              element.closest('[data-testid="category-autocomplete-modal"]'))
          ) {
            return false;
          }

          return true;
        }}
        style={{
          width: 275,
          padding: 15,
          color: theme.menuItemText,
          zIndex: '2500 !important',
        }}
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
