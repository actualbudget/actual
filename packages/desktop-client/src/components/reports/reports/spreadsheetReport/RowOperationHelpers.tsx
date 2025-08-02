import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type RowOperationHelpersProps = {
  customFormula: string;
  onFormulaChange: (formula: string) => void;
};

export function RowOperationHelpers({
  customFormula,
  onFormulaChange,
}: RowOperationHelpersProps) {
  const { t } = useTranslation();

  return (
    <>
      <Text
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: theme.pageText,
          marginBottom: 8,
        }}
      >
        {t('Quick Helpers')}
      </Text>

      <View
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <Button
          variant="bare"
          onPress={() => {
            const currentFormula = customFormula;
            const insertion = currentFormula ? ' + row-1' : 'row-1';
            onFormulaChange(currentFormula + insertion);
          }}
          style={{
            padding: '6px 8px',
            fontSize: 11,
            backgroundColor: theme.buttonBareBackground,
            border: `1px solid ${theme.buttonMenuBorder}`,
            borderRadius: 4,
          }}
        >
          + row-1
        </Button>

        <Button
          variant="bare"
          onPress={() => {
            const currentFormula = customFormula;
            const insertion = currentFormula ? ' - row-1' : 'row-1';
            onFormulaChange(currentFormula + insertion);
          }}
          style={{
            padding: '6px 8px',
            fontSize: 11,
            backgroundColor: theme.buttonBareBackground,
            border: `1px solid ${theme.buttonMenuBorder}`,
            borderRadius: 4,
          }}
        >
          - row-1
        </Button>

        <Button
          variant="bare"
          onPress={() => {
            onFormulaChange('sum(row-1:row-5)');
          }}
          style={{
            padding: '6px 8px',
            fontSize: 11,
            backgroundColor: theme.buttonBareBackground,
            border: `1px solid ${theme.buttonMenuBorder}`,
            borderRadius: 4,
          }}
        >
          sum()
        </Button>

        <Button
          variant="bare"
          onPress={() => {
            onFormulaChange('average(row-1:row-5)');
          }}
          style={{
            padding: '6px 8px',
            fontSize: 11,
            backgroundColor: theme.buttonBareBackground,
            border: `1px solid ${theme.buttonMenuBorder}`,
            borderRadius: 4,
          }}
        >
          avg()
        </Button>

        <Button
          variant="bare"
          onPress={() => {
            onFormulaChange('if(row-1>0, row-1, 0)');
          }}
          style={{
            padding: '6px 8px',
            fontSize: 11,
            backgroundColor: theme.buttonBareBackground,
            border: `1px solid ${theme.buttonMenuBorder}`,
            borderRadius: 4,
          }}
        >
          if()
        </Button>

        <Button
          variant="bare"
          onPress={() => {
            onFormulaChange('');
          }}
          style={{
            padding: '6px 8px',
            fontSize: 11,
            backgroundColor: theme.buttonBareBackground,
            border: `1px solid ${theme.buttonMenuBorder}`,
            borderRadius: 4,
          }}
        >
          <Trans>Clear</Trans>
        </Button>
      </View>

      <View
        style={{
          marginBottom: 10,
          padding: 8,
          backgroundColor: theme.formInputBackground,
          borderRadius: 4,
          border: `1px solid ${theme.formInputBorder}`,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
          {t('Row References:')}
        </Text>
        <Text
          style={{
            fontSize: 10,
            color: theme.pageTextSubdued,
            lineHeight: 1.3,
          }}
        >
          • row-1 = Row 1 value, row-2 = Row 2 value, etc.{'\n'}• Use
          row-1:row-5 for ranges{'\n'}• Operations: +, -, *, /{'\n'}• Functions:
          sum(), average(), min(), max(), count()
        </Text>
      </View>
    </>
  );
}
