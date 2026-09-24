import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { AccountTree } from './AccountTree';
import { CollapseChevron } from './CollapseChevron';
import { CountPill } from './CountPill';
import { sectionLabelStyle } from './styles';

type ClosedSectionProps = {
  accounts: AccountEntity[];
  isOpen: boolean;
  onToggle: () => void;
  isDragDisabled: boolean;
};

export function ClosedSection({
  accounts,
  isOpen,
  onToggle,
  isDragDisabled,
}: ClosedSectionProps) {
  const { t } = useTranslation();

  if (accounts.length === 0) {
    return null;
  }

  return (
    <View style={{ marginTop: spacing.xxs }}>
      <Button
        variant="bare"
        aria-expanded={isOpen}
        onPress={onToggle}
        className={css({
          '&[data-hovered], &[data-focus-visible]': {
            backgroundColor: theme.sidebarItemBackgroundHover,
          },
        })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: spacing.xs + spacing.xxs,
          paddingBlock: spacing.xs,
          paddingLeft: spacing.xs + spacing.xxs,
          paddingRight: spacing.sm,
          borderRadius: radius.sm,
          width: '100%',
        }}
      >
        <CollapseChevron isOpen={isOpen} color={theme.sidebarTextMuted} />
        <Text style={{ ...sectionLabelStyle, color: theme.sidebarTextMuted }}>
          <Trans>Closed</Trans>
        </Text>
        {!isOpen && <CountPill count={accounts.length} />}
      </Button>
      {isOpen && (
        <AccountTree
          label={t('Closed accounts')}
          side="closed"
          buckets={[{ group: null, accounts, failedCount: 0 }]}
          showSyncDot={false}
          isDragDisabled={isDragDisabled}
        />
      )}
    </View>
  );
}
