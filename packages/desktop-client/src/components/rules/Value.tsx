// @ts-strict-ignore
import React, { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { format as formatDate, parseISO } from 'date-fns';

import { getMonthYearFormat } from 'loot-core/shared/months';
import { getRecurringDescription } from 'loot-core/shared/schedules';
import { integerToCurrency } from 'loot-core/shared/util';

import { Link } from '@desktop-client/components/common/Link';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { usePayees } from '@desktop-client/hooks/usePayees';

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
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const payees = usePayees();
  const { list: categories } = useCategories();
  const accounts = useAccounts();
  const valueStyle = {
    color: theme.pageTextPositive,
    ...style,
  };
  const locale = useLocale();

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
      return t('(nothing)');
    } else if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    } else {
      switch (field) {
        case 'amount':
          return integerToCurrency(value);
        case 'date':
          if (value) {
            if (value.frequency) {
              return getRecurringDescription(value, dateFormat, locale);
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
        case 'payee_name':
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
              return t('(deleted)');
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
            <Link variant="text" onClick={onExpand} style={valueStyle}>
              {t('{{num}} more items...', { num: numHidden })}
            </Link>
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
        <Text style={valueStyle}>{formatValue(num1)}</Text> {t('and')}{' '}
        <Text style={valueStyle}>{formatValue(num2)}</Text>
      </Text>
    );
  } else {
    return <Text style={valueStyle}>{formatValue(value)}</Text>;
  }
}
