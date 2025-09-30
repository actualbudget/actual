import { GridList } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type PayeeEntity } from 'loot-core/types/models';

import { PayeesListItem } from './PayeesListItem';

import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';

type PayeesListProps = {
  payees: PayeeEntity[];
  ruleCounts: Map<string, number>;
  isLoading?: boolean;
  onPayeePress: (payee: PayeeEntity) => void;
  onPayeeDelete: (payee: PayeeEntity) => void;
};

export function PayeesList({
  payees,
  ruleCounts,
  isLoading = false,
  onPayeePress,
  onPayeeDelete,
}: PayeesListProps) {
  const { t } = useTranslation();

  if (isLoading && payees.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 100,
        }}
      >
        <AnimatedLoading style={{ width: 25, height: 25 }} />
      </View>
    );
  }

  if (payees.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: theme.pageTextSubdued,
            textAlign: 'center',
          }}
        >
          <Trans>No payees found.</Trans>
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GridList
        aria-label={t('Payees')}
        aria-busy={isLoading || undefined}
        items={payees}
        style={{
          flex: 1,
          paddingBottom: MOBILE_NAV_HEIGHT,
          overflow: 'auto',
        }}
      >
        {payee => (
          <PayeesListItem
            value={payee}
            ruleCount={ruleCounts.get(payee.id) ?? 0}
            onDelete={() => onPayeeDelete(payee)}
            onAction={() => onPayeePress(payee)}
          />
        )}
      </GridList>
      {isLoading && (
        <View
          style={{
            alignItems: 'center',
            paddingTop: 20,
          }}
        >
          <AnimatedLoading style={{ width: 20, height: 20 }} />
        </View>
      )}
    </View>
  );
}
