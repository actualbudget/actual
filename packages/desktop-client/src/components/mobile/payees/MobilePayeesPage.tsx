import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { getNormalisedString } from 'loot-core/shared/normalisation';
import { type PayeeEntity } from 'loot-core/types/models';

import { PayeesList } from './PayeesList';

import { Search } from '@desktop-client/components/common/Search';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useSelector } from '@desktop-client/redux';

export function MobilePayeesPage() {
  const { t } = useTranslation();
  const payees = usePayees();
  const [filter, setFilter] = useState('');
  const isLoading = useSelector(
    s => s.payees.isPayeesLoading || s.payees.isCommonPayeesLoading,
  );

  const filteredPayees: PayeeEntity[] = useMemo(() => {
    if (!filter) return payees;
    const norm = getNormalisedString(filter);
    return payees.filter(p => getNormalisedString(p.name).includes(norm));
  }, [payees, filter]);

  const onSearchChange = useCallback((value: string) => {
    setFilter(value);
  }, []);

  const handlePayeePress = useCallback((_payee: PayeeEntity) => {
    // Intentionally no-op for now
  }, []);

  return (
    <Page header={<MobilePageHeader title={t('Payees')} />} padding={0}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.mobilePageBackground,
          padding: 10,
          width: '100%',
          borderBottomWidth: 2,
          borderBottomStyle: 'solid',
          borderBottomColor: theme.tableBorder,
        }}
      >
        <Search
          placeholder={t('Filter payees…')}
          value={filter}
          onChange={onSearchChange}
          width="100%"
          height={styles.mobileMinHeight}
          style={{
            backgroundColor: theme.tableBackground,
            borderColor: theme.formInputBorder,
          }}
        />
      </View>
      <PayeesList
        payees={filteredPayees}
        isLoading={isLoading}
        onPayeePress={handlePayeePress}
      />
    </Page>
  );
}
