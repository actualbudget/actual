import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { AccountRow } from './AccountRow';
import { CollapseChevron } from './CollapseChevron';
import { CountPill } from './CountPill';
import { sectionLabelStyle } from './styles';

type ClosedSectionProps = {
  accounts: AccountEntity[];
  isOpen: boolean;
  onToggle: () => void;
};

export function ClosedSection({
  accounts,
  isOpen,
  onToggle,
}: ClosedSectionProps) {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <View style={{ marginTop: spacing.xxs }}>
      <Button
        variant="bare"
        aria-expanded={isOpen}
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: spacing.xs,
          padding: `${spacing.xs}px ${spacing.sm}px ${spacing.xs}px ${spacing.xs}px`,
          width: '100%',
          backgroundColor: 'transparent',
        }}
      >
        <CollapseChevron isOpen={isOpen} color={theme.sidebarTextMuted} />
        <Text style={{ ...sectionLabelStyle, color: theme.sidebarTextMuted }}>
          <Trans>Closed</Trans>
        </Text>
        {!isOpen && <CountPill count={accounts.length} />}
      </Button>
      {isOpen && (
        <View style={{ paddingLeft: spacing.xs }}>
          {accounts.map(account => (
            <AccountRow key={account.id} account={account} isClosed />
          ))}
        </View>
      )}
    </View>
  );
}
