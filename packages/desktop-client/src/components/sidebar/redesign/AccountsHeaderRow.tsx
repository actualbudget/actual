import { Trans, useTranslation } from 'react-i18next';

import {
  SvgAdd,
  SvgCheveronDownUp,
  SvgCheveronUpDown,
} from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';
import { replaceModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import * as bindings from '#spreadsheet/bindings';

import { SidebarBalance } from './SidebarBalance';
import { SidebarIconButton } from './SidebarIconButton';

type AccountsHeaderRowProps = {
  allOpen: boolean;
  onToggleAll: () => void;
};

export function AccountsHeaderRow({
  allOpen,
  onToggleAll,
}: AccountsHeaderRowProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const onAddAccount = () => {
    dispatch(replaceModal({ modal: { name: 'add-account', options: {} } }));
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingBlock: spacing.xs,
        paddingInline: spacing.sm,
      }}
    >
      <Link
        variant="internal"
        to="/accounts"
        isExactPathMatch
        style={{
          fontSize: 13,
          fontWeight: 700,
          textDecoration: 'none',
          color: theme.sidebarHeaderText,
        }}
        activeStyle={{ color: theme.sidebarItemTextSelected }}
      >
        <Trans>Accounts</Trans>
      </Link>
      <SidebarIconButton
        Icon={allOpen ? SvgCheveronDownUp : SvgCheveronUpDown}
        label={allOpen ? t('Collapse all groups') : t('Expand all groups')}
        onPress={onToggleAll}
      />
      <SidebarIconButton
        Icon={SvgAdd}
        label={t('Add account')}
        onPress={onAddAccount}
      />
      <View style={{ flex: 1 }} />
      <Link
        variant="internal"
        to="/accounts"
        isExactPathMatch
        style={{ textDecoration: 'none', color: theme.sidebarItemText }}
        activeStyle={{ color: theme.sidebarItemTextSelected }}
      >
        <SidebarBalance
          binding={bindings.allAccountBalance()}
          testId="sidebar-all-accounts-balance"
          style={{ fontSize: 12, fontWeight: 600 }}
        />
      </Link>
    </View>
  );
}
