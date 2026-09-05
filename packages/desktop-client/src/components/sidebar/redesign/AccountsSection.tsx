import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import * as bindings from '#spreadsheet/bindings';

import { AccountSearchField } from './AccountSearchField';
import { AccountsHeaderRow } from './AccountsHeaderRow';
import { ClosedSection } from './ClosedSection';
import { SidebarDragScopeProvider } from './SidebarDragScope';
import { SideGroup } from './SideGroup';
import { useAccountReorder } from './useAccountReorder';
import {
  filterSidebarTree,
  useSidebarAccountTree,
} from './useSidebarAccountTree';
import { bucketKey, useSidebarCollapseState } from './useSidebarCollapseState';

export function AccountsSection() {
  const { t } = useTranslation();
  const tree = useSidebarAccountTree();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery !== '';

  const collapse = useSidebarCollapseState({ tree, isSearching });
  const reorder = useAccountReorder({ isDragDisabled: isSearching });

  const onToggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    setQuery('');
  };

  const visibleTree = filterSidebarTree(tree, trimmedQuery);

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
        {tree.onBudget.buckets.length > 0 && (
          <SidebarDragScopeProvider
            scope={{
              dragType: 'sidebar-account-on',
              canDrag: reorder.canDrag,
              onDragChange: reorder.onDragChange,
              onDrop: reorder.onDrop,
            }}
          >
            <SideGroup
              label={t('On budget')}
              side="on"
              showSyncDot={showSyncDot}
              sideData={visibleTree.onBudget}
              totalBinding={bindings.onBudgetAccountBalance()}
              balanceTestId="sidebar-on-budget-balance"
              isOpen={collapse.isOpen('onbudget')}
              onToggle={() => collapse.toggle('onbudget')}
              isBucketOpen={bucket => collapse.isOpen(bucketKey('on', bucket))}
              onToggleBucket={bucket =>
                collapse.toggle(bucketKey('on', bucket))
              }
            />
          </SidebarDragScopeProvider>
        )}
        {tree.offBudget.buckets.length > 0 && (
          <SidebarDragScopeProvider
            scope={{
              dragType: 'sidebar-account-off',
              canDrag: reorder.canDrag,
              onDragChange: reorder.onDragChange,
              onDrop: reorder.onDrop,
            }}
          >
            <SideGroup
              label={t('Off budget')}
              side="off"
              showSyncDot={showSyncDot}
              sideData={visibleTree.offBudget}
              totalBinding={bindings.offBudgetAccountBalance()}
              balanceTestId="sidebar-off-budget-balance"
              isOpen={collapse.isOpen('offbudget')}
              onToggle={() => collapse.toggle('offbudget')}
              isBucketOpen={bucket => collapse.isOpen(bucketKey('off', bucket))}
              onToggleBucket={bucket =>
                collapse.toggle(bucketKey('off', bucket))
              }
            />
          </SidebarDragScopeProvider>
        )}
        <SidebarDragScopeProvider
          scope={{
            dragType: 'sidebar-account-closed',
            canDrag: reorder.canDrag,
            onDragChange: reorder.onDragChange,
            onDrop: reorder.onDrop,
          }}
        >
          <ClosedSection
            accounts={visibleTree.closed}
            isOpen={collapse.isOpen('closed')}
            onToggle={() => collapse.toggle('closed')}
          />
        </SidebarDragScopeProvider>
        <View
          style={{ height: reorder.isDragging ? spacing.xl : spacing.md }}
        />
      </View>
    </View>
  );
}
