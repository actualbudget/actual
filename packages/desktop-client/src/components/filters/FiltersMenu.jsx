import React, { useReducer } from 'react';
import { useSelector } from 'react-redux';

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

import { theme } from '../../style';
import { HoverTarget } from '../common/HoverTarget';
import { Menu } from '../common/Menu';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Tooltip } from '../tooltips';

import { CompactFiltersButton } from './CompactFiltersButton';
import { ConfigureField } from './ConfigureField';
import { FiltersButton } from './FiltersButton';
import { subfieldFromFilter } from './subfieldFromFilter';
import { updateFilterReducer } from './updateFilterReducer';

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

export function FilterButton({ onApply, compact, hover }) {
  const filters = useFilters();

  const { dateFormat } = useSelector(state => {
    return {
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    };
  });

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
              name,
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
