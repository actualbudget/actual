// @ts-strict-ignore
import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { getMonthYearFormat } from '@actual-app/core/shared/months';
import { format as formatDate, parseISO } from 'date-fns';

import { Link } from '#components/common/Link';
import { FinancialText } from '#components/FinancialText';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { usePayees } from '#hooks/usePayees';
import { getRecurringDescription } from '#util/schedule';

type ValueProps<T> = {
  value: T;
  field: unknown;
  valueIsRaw?: boolean;
  inline?: boolean;
  describe?: (item: T) => string;
  style?: CSSProperties;
};

export function Value<T>({
  value,
  field,
  valueIsRaw,
  inline = false,
  describe,
  style,
}: ValueProps<T>) {
  const { t } = useTranslation();
  const format = useFormat();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { data: payees } = usePayees();
  const {
    data: { list: categories, grouped: categoryGroups } = {
      list: [],
      grouped: [],
    },
  } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const valueStyle = {
    color: theme.pageTextPositive,
    ...style,
  };
  const ValueText = field === 'amount' ? FinancialText : Text;
  const locale = useLocale();
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
        case 'amount-inflow':
        case 'amount-outflow':
          return format(value, 'financial');
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
          if (valueIsRaw) {
            return value;
          }
          const payee = payees.find(p => p.id === value);
          return payee ? (describe?.(value) ?? payee.name) : t('(deleted)');
        case 'category':
          if (valueIsRaw) {
            return value;
          }
          const category = categories.find(c => c.id === value);
          return category
            ? (describe?.(value) ?? category.name)
            : t('(deleted)');
        case 'category_group':
          if (valueIsRaw) {
            return value;
          }
          const categoryGroup = categoryGroups.find(g => g.id === value);
          return categoryGroup
            ? (describe?.(value) ?? categoryGroup.name)
            : t('(deleted)');
        case 'account':
          if (valueIsRaw) {
            return value;
          }
          const account = accounts.find(a => a.id === value);
          return account ? (describe?.(value) ?? account.name) : t('(deleted)');
        case 'rule':
          if (valueIsRaw) {
            return value;
          }

          return describe?.(value) ?? value;
        default:
          throw new Error(`Unknown field ${String(field)}`);
      }
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <ValueText style={valueStyle}>(empty)</ValueText>;
    } else if (value.length === 1) {
      return (
        <Text>
          [<ValueText style={valueStyle}>{formatValue(value[0])}</ValueText>]
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
          const text = (
            <ValueText style={valueStyle}>{formatValue(v)}</ValueText>
          );
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
        <ValueText style={valueStyle}>{formatValue(num1)}</ValueText> {t('and')}{' '}
        <ValueText style={valueStyle}>{formatValue(num2)}</ValueText>
      </Text>
    );
  } else {
    return <ValueText style={valueStyle}>{formatValue(value)}</ValueText>;
  }
}
