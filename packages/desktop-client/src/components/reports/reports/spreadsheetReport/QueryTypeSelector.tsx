import React from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { FormField, FormLabel } from '@desktop-client/components/forms';

type QueryType = 'cost' | 'balance' | 'formula' | 'row-operation';

type QueryTypeSelectorProps = {
  queryType: QueryType;
  onQueryTypeChange: (queryType: QueryType) => void;
  getQueryTypeDescription: () => string;
};

export function QueryTypeSelector({
  queryType,
  onQueryTypeChange,
  getQueryTypeDescription,
}: QueryTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <FormField style={{ marginBottom: 15 }}>
      <FormLabel title={t('Query Type')} />
      <Select
        value={queryType}
        onChange={(value: QueryType) => onQueryTypeChange(value)}
        options={[
          ['cost', t('Transaction Cost')],
          ['balance', t('Account Balance')],
          ['row-operation', t('Row Reference')],
          ['formula', t('Custom Formula')],
        ]}
      />
      <Text
        style={{
          fontSize: 12,
          color: theme.pageTextSubdued,
          marginTop: 5,
          lineHeight: 1.4,
        }}
      >
        {getQueryTypeDescription()}
      </Text>
    </FormField>
  );
}
