/* eslint-disable actual/typography */
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { RowOperationHelpers } from './RowOperationHelpers';

import { FormField, FormLabel } from '@desktop-client/components/forms';

type QueryType = 'cost' | 'balance' | 'formula' | 'row-operation';

type FormulaQueryFormProps = {
  queryType: QueryType;
  customFormula: string;
  onFormulaChange: (formula: string) => void;
};

export function FormulaQueryForm({
  queryType,
  customFormula,
  onFormulaChange,
}: FormulaQueryFormProps) {
  const { t } = useTranslation();

  return (
    <>
      <Text
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.pageText,
          marginBottom: 10,
        }}
      >
        {queryType === 'row-operation'
          ? t('Row Reference')
          : t('Custom Formula')}
      </Text>

      <FormField style={{ marginBottom: 10 }}>
        <FormLabel title={t('Formula')} />
        <Input
          value={customFormula}
          onChange={e => {
            const value = e.target.value;
            // Input validation to prevent DoS attacks
            if (value.length <= 5000) {
              onFormulaChange(value);
            } else {
              console.warn('QueryBuilder: Formula too long, ignoring input');
            }
          }}
          placeholder={
            queryType === 'row-operation'
              ? t('e.g., row-1 + row-2, row-2 - row-1, sum(row-1:row-5)')
              : t(
                  'e.g., sum(row-1:row-5), if(row-1>0, row-1, 0), cost({ category:"Food" })',
                )
          }
          style={{
            fontFamily: 'var(--fl-code-font, monospace)',
            fontSize: 13,
          }}
        />
      </FormField>

      {queryType === 'row-operation' && (
        <RowOperationHelpers
          customFormula={customFormula}
          onFormulaChange={onFormulaChange}
        />
      )}

      <Text
        style={{
          fontSize: 11,
          color: theme.pageTextSubdued,
          lineHeight: 1.4,
        }}
      >
        {queryType === 'row-operation'
          ? t(
              'Tip: Click the helper buttons above to quickly build common formulas',
            )
          : t(
              'Available: sum, average, min, max, count, if, cost, balance, abs, round, sqrt, today, and more',
            )}
      </Text>
    </>
  );
}
