import { useTranslation } from 'react-i18next';

import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import * as bindings from '#spreadsheet/bindings';

import { AccountsHeaderRow } from './AccountsHeaderRow';
import { ClosedSection } from './ClosedSection';
import { SideGroup } from './SideGroup';
import { useSidebarAccountTree } from './useSidebarAccountTree';
import { bucketKey, useSidebarCollapseState } from './useSidebarCollapseState';

export function AccountsSection() {
  const { t } = useTranslation();
  const tree = useSidebarAccountTree();
  const collapse = useSidebarCollapseState({ tree, isSearching: false });

  const showSyncDot = [
    ...tree.onBudget.buckets.map(b => b.accounts).flat(),
    ...tree.offBudget.buckets.map(b => b.accounts).flat(),
  ].reduce((seen, account) => seen || account.bank !== null, false);

  return (
    <View
      style={{
        flexGrow: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: `0 ${spacing.sm}px`,
      }}
    >
      <View style={{ flexShrink: 0 }}>
        <AccountsHeaderRow
          allOpen={collapse.allOpen}
          onToggleAll={collapse.toggleAll}
        />
        {tree.onBudget.buckets.length > 0 && (
          <SideGroup
            label={t('On budget')}
            side="on"
            showSyncDot={showSyncDot}
            sideData={tree.onBudget}
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
            showSyncDot={showSyncDot}
            sideData={tree.offBudget}
            totalBinding={bindings.offBudgetAccountBalance()}
            balanceTestId="sidebar-off-budget-balance"
            isOpen={collapse.isOpen('offbudget')}
            onToggle={() => collapse.toggle('offbudget')}
            isBucketOpen={bucket => collapse.isOpen(bucketKey('off', bucket))}
            onToggleBucket={bucket => collapse.toggle(bucketKey('off', bucket))}
          />
        )}
        <ClosedSection
          accounts={tree.closed}
          isOpen={collapse.isOpen('closed')}
          onToggle={() => collapse.toggle('closed')}
        />
        <View style={{ height: spacing.md }} />
      </View>
    </View>
  );
}
