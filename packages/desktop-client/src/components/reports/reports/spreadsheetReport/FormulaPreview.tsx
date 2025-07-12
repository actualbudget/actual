import React from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type QueryType = 'cost' | 'balance' | 'formula' | 'row-operation';

type FormulaPreviewProps = {
  queryType: QueryType;
  selectedAccount: string;
  selectedCategory: string;
  selectedPayee: string;
  selectedNotes: string;
  cleared: boolean | null;
  reconciled: boolean | null;
  transfer: boolean | null;
  minAmount: string;
  maxAmount: string;
  datePreset: string;
  customFormula: string;
  generateFormula: () => string;
  isFormValid: () => boolean;
};

export function FormulaPreview({
  queryType,
  selectedAccount,
  selectedCategory,
  selectedPayee,
  selectedNotes,
  cleared,
  reconciled,
  transfer,
  minAmount,
  maxAmount,
  datePreset,
  customFormula,
  generateFormula,
  isFormValid,
}: FormulaPreviewProps) {
  const { t } = useTranslation();

  return (
    <View style={{ marginTop: 20, marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.pageText,
          marginBottom: 8,
        }}
      >
        {t('Formula Preview')}
      </Text>

      <View
        style={{
          fontFamily: 'var(--fl-code-font, monospace)',
          fontSize: 12,
          padding: 10,
          backgroundColor: theme.formInputBackground,
          border: `1px solid ${theme.formInputBorder}`,
          borderRadius: 4,
          color:
            generateFormula().length > 0
              ? theme.pageText
              : theme.pageTextSubdued,
          minHeight: 30,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {generateFormula() ||
          t('No formula generated - please fill in required fields')}
      </View>

      {!isFormValid() && (
        <Text
          style={{
            fontSize: 11,
            color: theme.errorText,
            marginTop: 5,
          }}
        >
          {queryType === 'balance' &&
            !selectedAccount &&
            t('Please select an account')}
          {queryType === 'cost' &&
            !selectedCategory &&
            !selectedAccount &&
            !selectedPayee &&
            !selectedNotes &&
            cleared === null &&
            reconciled === null &&
            transfer === null &&
            !minAmount &&
            !maxAmount &&
            datePreset === 'thisMonth' &&
            t('Please specify at least one filter')}
          {(queryType === 'formula' || queryType === 'row-operation') &&
            !customFormula.trim() &&
            t('Please enter a formula')}
        </Text>
      )}
    </View>
  );
}
