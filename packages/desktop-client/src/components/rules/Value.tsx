// @ts-strict-ignore
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { format as formatDate, parseISO } from 'date-fns';

import { getMonthYearFormat } from 'loot-core/src/shared/months';
import { getRecurringDescription } from 'loot-core/src/shared/schedules';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { useCategories } from '../../hooks/useCategories';
import { type CSSProperties, theme } from '../../style';
import { LinkButton } from '../common/LinkButton';
import { Text } from '../common/Text';

type ValueProps<T> = {
  value: T;
  field: unknown;
  valueIsRaw?: boolean;
  inline?: boolean;
  data?: unknown;
  describe?: (item: T) => string;
  style?: CSSProperties;
};

export function Value<T>({
  value,
  field,
  valueIsRaw,
  inline = false,
  data: dataProp,
  // @ts-expect-error fix this later
  describe = x => x.name,
  style,
}: ValueProps<T>) {
  const dateFormat = useSelector(
    state => state.prefs.local.dateFormat || 'MM/dd/yyyy',
  );
  const payees = useSelector(state => state.queries.payees);
  const { list: categories } = useCategories();
  const accounts = useSelector(state => state.queries.accounts);
  const valueStyle = {
    color: theme.pageTextPositive,
    ...style,
  };

  const data =
    dataProp ||
    (field === 'payee'
      ? payees
      : field === 'category'
        ? categories
        : field === 'account'
          ? accounts
          : []);

  const [expanded, setExpanded] = useState(false);

  function onExpand(e) {
    e.preventDefault();
    setExpanded(true);
  }

  function formatValue(value) {
    if (value == null || value === '') {
      return '(nothing)';
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else {
      switch (field) {
        case 'amount':
          return integerToCurrency(value);
        case 'date':
          if (value) {
            if (value.frequency) {
              return getRecurringDescription(value, dateFormat);
            }
            return formatDate(parseISO(value), dateFormat);
          }
          return null;
        case 'month':
          return value
            ? formatDate(parseISO(value), getMonthYearFormat(dateFormat))
            : null;
        case 'year':
          return value ? formatDate(parseISO(value), 'yyyy') : null;
        case 'notes':
        case 'imported_payee':
          return value;
        case 'payee':
        case 'category':
        case 'account':
        case 'rule':
          if (valueIsRaw) {
            return value;
          }
          if (data && Array.isArray(data)) {
            const item = data.find(item => item.id === value);
            if (item) {
              return describe(item);
            } else {
              return '(deleted)';
            }
          }

          return '…';
        default:
          throw new Error(`Unknown field ${field}`);
      }
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Text style={valueStyle}>(empty)</Text>;
    } else if (value.length === 1) {
      return (
        <Text>
          [<Text style={valueStyle}>{formatValue(value[0])}</Text>]
        </Text>
      );
    }

    let displayed: unknown[] = value;
    if (!expanded && value.length > 4) {
      displayed = value.slice(0, 3);
    }
    const numHidden = value.length - displayed.length;
    return (
      <Text style={{ color: theme.tableText }}>
        [
        {displayed.map((v, i) => {
          const text = <Text style={valueStyle}>{formatValue(v)}</Text>;
          let spacing;
          if (inline) {
            spacing = i !== 0 ? ' ' : '';
          } else {
            spacing = (
              <>
                {i === 0 && <br />}
                &nbsp;&nbsp;
              </>
            );
          }

          return (
            <Text key={i}>
              {spacing}
              {text}
              {i === value.length - 1 ? '' : ','}
              {!inline && <br />}
            </Text>
          );
        })}
        {numHidden > 0 && (
          <Text style={valueStyle}>
            &nbsp;&nbsp;
            <LinkButton onClick={onExpand} style={valueStyle}>
              {numHidden} more items...
            </LinkButton>
            {!inline && <br />}
          </Text>
        )}
        ]
      </Text>
    );
    // @ts-expect-error Fix typechecker here
  } else if (value && value.num1 != null && value.num2 != null) {
    // An "in between" type
    // @ts-expect-error Fix typechecker here
    const { num1, num2 } = value;
    return (
      <Text>
        <Text style={valueStyle}>{formatValue(num1)}</Text> and{' '}
        <Text style={valueStyle}>{formatValue(num2)}</Text>
      </Text>
    );
  } else {
    return <Text style={valueStyle}>{formatValue(value)}</Text>;
  }
}
