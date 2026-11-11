import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { Link } from '#components/common/Link';
import { replaceModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import * as bindings from '#spreadsheet/bindings';

import { AccountSearchField } from './AccountSearchField';
import { AccountsHeaderRow } from './AccountsHeaderRow';
import { ClosedSection } from './ClosedSection';
import { SidebarBalance } from './SidebarBalance';
import { SideGroup } from './SideGroup';
import { sectionLabelStyle } from './styles';
import {
  filterSidebarTree,
  useSidebarAccountTree,
} from './useSidebarAccountTree';
import { bucketKey, useSidebarCollapseState } from './useSidebarCollapseState';

function AllAccountsRow() {
  return (
    <Link
      variant="internal"
      to="/accounts"
      isExactPathMatch
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingBlock: spacing.xs,
        paddingLeft: spacing.sm,
        paddingRight: spacing.sm,
        borderRadius: radius.sm,
        textDecoration: 'none',
        color: theme.sidebarItemText,
        ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
      }}
      activeStyle={{
        backgroundColor: theme.sidebarItemBackgroundSelected,
        color: theme.sidebarItemTextSelected,
      }}
    >
      <Text style={{ ...sectionLabelStyle, flex: 1 }}>
        <Trans>All accounts</Trans>
      </Text>
      <SidebarBalance
        binding={bindings.allAccountBalance()}
        testId="sidebar-all-accounts-balance"
        style={{ fontSize: 12, fontWeight: 600, color: 'inherit' }}
      />
    </Link>
  );
}

function AddAccountRow() {
  const dispatch = useDispatch();

  const onAddAccount = () => {
    dispatch(replaceModal({ modal: { name: 'add-account', options: {} } }));
  };

  return (
    <Button
      variant="bare"
      data-testid="sidebar-add-account"
      onPress={onAddAccount}
      className={css({
        color: theme.sidebarTextSubdued,
        '&[data-hovered], &[data-focus-visible]': {
          backgroundColor: theme.sidebarItemBackgroundHover,
          color: theme.sidebarItemTextSelected,
        },
      })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: spacing.sm,
        marginTop: spacing.xs,
        paddingBlock: spacing.xs + spacing.xxs,
        paddingInline: spacing.sm,
        borderRadius: radius.sm,
        width: '100%',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <SvgAdd width={11} height={11} style={{ flexShrink: 0 }} />
      <Text>
        <Trans>Add account</Trans>
      </Text>
    </Button>
  );
}

export function AccountsSection() {
  const { t } = useTranslation();
  const tree = useSidebarAccountTree();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery !== '';

  const collapse = useSidebarCollapseState({ tree, isSearching });

  const onToggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    setQuery('');
  };

  const visibleTree = filterSidebarTree(tree, trimmedQuery);

  const showSyncDot = [
    ...tree.onBudget.buckets.map(b => b.accounts).flat(),
    ...tree.offBudget.buckets.map(b => b.accounts).flat(),
  ].reduce((seen, account) => seen || account.bank !== null, false);

  const hasAccounts =
    tree.onBudget.buckets.length > 0 ||
    tree.offBudget.buckets.length > 0 ||
    tree.closed.length > 0;

  return (
    <View
      data-testid="sidebar-accounts"
      style={{
        flexGrow: 1,
        minHeight: 0,
        overflowY: 'auto',
        paddingInline: spacing.sm,
      }}
    >
      <View style={{ flexShrink: 0 }}>
        <AccountsHeaderRow
          allOpen={collapse.allOpen}
          onToggleAll={collapse.toggleAll}
          isToggleAllDisabled={isSearching}
          isSearchOpen={isSearchOpen}
          onToggleSearch={onToggleSearch}
        />
        {isSearchOpen && (
          <AccountSearchField
            value={query}
            onChange={setQuery}
            onClose={onToggleSearch}
          />
        )}
        <AllAccountsRow />
        {!hasAccounts && (
          <Text
            style={{
              fontSize: 12,
              lineHeight: '1.4em',
              color: theme.sidebarTextSubdued,
              paddingInline: spacing.sm,
              paddingBlock: spacing.xs,
            }}
          >
            {t(
              'No accounts yet. Add your checking, savings or credit card to start tracking transactions.',
            )}
          </Text>
        )}
        {tree.onBudget.buckets.length > 0 && (
          <SideGroup
            label={t('On budget')}
            side="on"
            isDragDisabled={isSearching}
            showSyncDot={showSyncDot}
            sideData={visibleTree.onBudget}
            totalBinding={bindings.onBudgetAccountBalance()}
            balanceTestId="sidebar-on-budget-balance"
            isOpen={collapse.isOpen('onbudget')}
            onToggle={() => collapse.toggle('onbudget')}
            isBucketOpen={bucket => collapse.isOpen(bucketKey('on', bucket))}
            onToggleBucket={bucket => collapse.toggle(bucketKey('on', bucket))}
          />
        )}
        {tree.offBudget.buckets.length > 0 && (
          <SideGroup
            label={t('Off budget')}
            side="off"
            isDragDisabled={isSearching}
            showSyncDot={showSyncDot}
            sideData={visibleTree.offBudget}
            totalBinding={bindings.offBudgetAccountBalance()}
            balanceTestId="sidebar-off-budget-balance"
            isOpen={collapse.isOpen('offbudget')}
            onToggle={() => collapse.toggle('offbudget')}
            isBucketOpen={bucket => collapse.isOpen(bucketKey('off', bucket))}
            onToggleBucket={bucket => collapse.toggle(bucketKey('off', bucket))}
          />
        )}
        <ClosedSection
          accounts={visibleTree.closed}
          isOpen={collapse.isOpen('closed')}
          onToggle={() => collapse.toggle('closed')}
          isDragDisabled={isSearching}
        />
        <AddAccountRow />
        <View style={{ height: spacing.md }} />
      </View>
    </View>
  );
}
