import { Trans, useTranslation } from 'react-i18next';

import {
  SvgCheveronDownUp,
  SvgCheveronUpDown,
} from '@actual-app/components/icons/v1';
import { SvgSearchAlternate } from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { Term } from '#components/common/Term';

import { SidebarIconButton } from './SidebarIconButton';
import { sectionHeadingStyle } from './styles';

type AccountsHeaderRowProps = {
  allOpen: boolean;
  onToggleAll: () => void;
  isToggleAllDisabled: boolean;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
};

export function AccountsHeaderRow({
  allOpen,
  onToggleAll,
  isToggleAllDisabled,
  isSearchOpen,
  onToggleSearch,
}: AccountsHeaderRowProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingBlock: spacing.xs,
        paddingInline: spacing.sm,
        marginTop: spacing.xs,
      }}
    >
      <Term
        id="account"
        style={{ ...sectionHeadingStyle, color: theme.sidebarTextSubdued }}
      >
        <Trans>Accounts</Trans>
      </Term>
      <View style={{ flex: 1 }} />
      <SidebarIconButton
        Icon={SvgSearchAlternate}
        label={t('Find account')}
        isToggledOn={isSearchOpen}
        onPress={onToggleSearch}
      />
      <SidebarIconButton
        Icon={allOpen ? SvgCheveronDownUp : SvgCheveronUpDown}
        label={allOpen ? t('Collapse all groups') : t('Expand all groups')}
        isDisabled={isToggleAllDisabled}
        onPress={onToggleAll}
      />
    </View>
  );
}
