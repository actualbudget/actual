import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Button as AriaButton,
  Collection,
  Tree,
  TreeItem,
  TreeItemContent,
  useDragAndDrop,
} from 'react-aria-components';
import type { Key } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { useMatch } from 'react-router';

import { AlignedText } from '@actual-app/components/aligned-text';
import {
  SvgCheveronDown,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import type { AccountEntity } from 'loot-core/types/models';

import { Account } from './Account';

import {
  moveAccount,
  updateAccount,
} from '@desktop-client/accounts/accountsSlice';
import { AccountTypeAutocomplete } from '@desktop-client/components/autocomplete/AccountTypeAutocomplete';
import { Link } from '@desktop-client/components/common/Link';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useClosedAccounts } from '@desktop-client/hooks/useClosedAccounts';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useFailedAccounts } from '@desktop-client/hooks/useFailedAccounts';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useOffBudgetAccounts } from '@desktop-client/hooks/useOffBudgetAccounts';
import { useOnBudgetAccounts } from '@desktop-client/hooks/useOnBudgetAccounts';
import { useUpdatedAccounts } from '@desktop-client/hooks/useUpdatedAccounts';
import { useDispatch, useSelector } from '@desktop-client/redux';
import type { Binding, SheetFields } from '@desktop-client/spreadsheet';
import * as bindings from '@desktop-client/spreadsheet/bindings';

const fontWeight = 600;

/** Style that hides an element visually but keeps it in the a11y tree. */
const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  border: 0,
};

/** Structural keys that should be expanded by default. */
const ALL_ACCOUNTS_KEY = 'all-accounts';
const ON_BUDGET_KEY = 'onbudget';
const OFF_BUDGET_KEY = 'offbudget';
const CLOSED_ACCOUNTS_KEY = 'closed';
const SEEN_KEY_PREFIX = 'seen:';

const STRUCTURAL_EXPANDED_KEYS = [
  ALL_ACCOUNTS_KEY,
  ON_BUDGET_KEY,
  OFF_BUDGET_KEY,
];

const TYPE_GROUP_SEPARATOR = '-type-';

type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
  // Only set on account leaf nodes
  account?: AccountEntity;
  // Only set on group/header nodes
  to?: string;
  query?: Binding<'account', SheetFields<'account'>>;
  isTitle?: boolean;
  isTypeGroup?: boolean;
};

/** Keys that represent structural nodes which must not be dragged. */
const NON_DRAGGABLE_KEYS = new Set([
  ALL_ACCOUNTS_KEY,
  ON_BUDGET_KEY,
  OFF_BUDGET_KEY,
  CLOSED_ACCOUNTS_KEY,
]);

function isTypeGroupKey(key: string): boolean {
  return key.includes(TYPE_GROUP_SEPARATOR);
}

function getBudgetPrefixFromTypeGroupKey(typeGroupKey: string): string {
  return typeGroupKey.split(TYPE_GROUP_SEPARATOR)[0];
}

function getTypeNameFromTypeGroupKey(typeGroupKey: string): string {
  return typeGroupKey.split(TYPE_GROUP_SEPARATOR)[1];
}

function getTypeGroupKey(budgetPrefix: string, typeName: string): string {
  return `${budgetPrefix}${TYPE_GROUP_SEPARATOR}${typeName}`;
}

function isTextDragItem(item: { kind: string }): item is {
  kind: 'text';
  getText: (type: string) => Promise<string>;
} {
  return (
    item.kind === 'text' &&
    'getText' in item &&
    typeof (item as { getText?: unknown }).getText === 'function'
  );
}

/**
 * Group a list of accounts by their `type` field, returning:
 * - untyped accounts (type is null/empty) as direct children
 * - typed accounts nested under type group nodes
 *
 * `typeOrder` is a persisted list of type-group keys
 * (e.g. "onbudget-type-Checking") that defines the sort order.
 * Types not in the list are appended alphabetically.
 */
function groupAccountsByType(
  accounts: AccountEntity[],
  budgetPrefix: string,
  typeOrder: string[],
): TreeNode[] {
  const untyped: TreeNode[] = [];
  const byType = new Map<string, AccountEntity[]>();

  for (const account of accounts) {
    if (!account.type) {
      untyped.push({
        id: account.id,
        name: account.name,
        account,
      });
    } else {
      const list = byType.get(account.type) || [];
      list.push(account);
      byType.set(account.type, list);
    }
  }

  const isOffBudget = budgetPrefix === OFF_BUDGET_KEY;

  const typeGroups: TreeNode[] = [...byType.entries()]
    .sort(([a], [b]) => {
      const aKey = `${budgetPrefix}${TYPE_GROUP_SEPARATOR}${a}`;
      const bKey = `${budgetPrefix}${TYPE_GROUP_SEPARATOR}${b}`;
      const aIdx = typeOrder.indexOf(aKey);
      const bIdx = typeOrder.indexOf(bKey);
      // Both in the saved order → use saved positions
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      // Only one in the saved order → it comes first
      if (aIdx >= 0) return -1;
      if (bIdx >= 0) return 1;
      // Neither saved → alphabetical
      return a.localeCompare(b);
    })
    .map(([typeName, accts]) => ({
      id: `${budgetPrefix}${TYPE_GROUP_SEPARATOR}${typeName}`,
      name: typeName,
      isTypeGroup: true,
      query: bindings.accountTypeBalance(typeName, isOffBudget),
      children: accts.map(account => ({
        id: account.id,
        name: account.name,
        account,
      })),
    }));

  return [...untyped, ...typeGroups];
}

export function Accounts() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const accounts = useAccounts();
  const failedAccounts = useFailedAccounts();
  const updatedAccounts = useUpdatedAccounts();
  const offbudgetAccounts = useOffBudgetAccounts();
  const onBudgetAccounts = useOnBudgetAccounts();
  const closedAccounts = useClosedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);

  // Persisted expand/collapse state
  const [savedExpandedKeys, setSavedExpandedKeys] = useLocalPref(
    'sidebar.expandedKeys',
  );

  // Persisted type-group ordering
  const [savedTypeOrder = [], setSavedTypeOrder] =
    useLocalPref('sidebar.typeOrder');

  // Build the tree data structure
  const treeItems = useMemo(() => {
    const children: TreeNode[] = [];

    if (onBudgetAccounts.length > 0) {
      children.push({
        id: ON_BUDGET_KEY,
        name: t('On budget'),
        to: '/accounts/onbudget',
        query: bindings.onBudgetAccountBalance(),
        isTitle: true,
        children: groupAccountsByType(
          onBudgetAccounts,
          ON_BUDGET_KEY,
          savedTypeOrder,
        ),
      });
    }

    if (offbudgetAccounts.length > 0) {
      children.push({
        id: OFF_BUDGET_KEY,
        name: t('Off budget'),
        to: '/accounts/offbudget',
        query: bindings.offBudgetAccountBalance(),
        isTitle: true,
        children: groupAccountsByType(
          offbudgetAccounts,
          OFF_BUDGET_KEY,
          savedTypeOrder,
        ),
      });
    }

    // Closed accounts as a collapsible tree node (collapsed by default,
    // hidden entirely when there are no closed accounts)
    if (closedAccounts.length > 0) {
      children.push({
        id: CLOSED_ACCOUNTS_KEY,
        name: t('Closed accounts'),
        // to: '/accounts/closed',
        query: bindings.closedAccountBalance(),
        isTitle: true,
        children: closedAccounts.map(account => ({
          id: account.id,
          name: account.name,
          account,
        })),
      });
    }

    return [
      {
        id: ALL_ACCOUNTS_KEY,
        name: t('All accounts'),
        to: '/accounts',
        query: bindings.allAccountBalance(),
        isTitle: true,
        children,
      },
    ];
  }, [onBudgetAccounts, offbudgetAccounts, closedAccounts, savedTypeOrder, t]);

  // Collect all type group IDs so they can be expanded by default
  const allTypeGroupKeys = useMemo(() => {
    const keys: string[] = [];
    function walk(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.isTypeGroup) {
          keys.push(node.id);
        }
        if (node.children) {
          walk(node.children);
        }
      }
    }
    walk(treeItems);
    return keys;
  }, [treeItems]);

  const savedExpanded = useMemo(() => {
    if (!savedExpandedKeys) {
      return null;
    }
    const expanded = new Set<Key>();
    const seen = new Set<string>();
    for (const key of savedExpandedKeys) {
      if (key.startsWith(SEEN_KEY_PREFIX)) {
        seen.add(key.slice(SEEN_KEY_PREFIX.length));
      } else {
        expanded.add(key);
      }
    }
    return { expanded, seen };
  }, [savedExpandedKeys]);

  // Default expanded: structural keys + all type groups.
  // When the user has a saved pref, only auto-expand *new* type groups
  // that the user has not seen before.
  const expandedKeys = useMemo(() => {
    if (!savedExpanded) {
      // No saved state yet — expand everything except closed
      return new Set<Key>([...STRUCTURAL_EXPANDED_KEYS, ...allTypeGroupKeys]);
    }
    const unseenTypeGroupKeys = allTypeGroupKeys.filter(
      key => !savedExpanded.seen.has(key),
    );
    return new Set<Key>([...savedExpanded.expanded, ...unseenTypeGroupKeys]);
  }, [savedExpanded, allTypeGroupKeys]);

  const expandedKeysRef = useRef<Set<Key>>(new Set(expandedKeys));
  useEffect(() => {
    expandedKeysRef.current = new Set(expandedKeys);
  }, [expandedKeys]);

  const persistExpandedKeys = useCallback(
    (keys: Set<Key>) => {
      expandedKeysRef.current = new Set(keys);
      const seenMarkers = allTypeGroupKeys.map(
        key => `${SEEN_KEY_PREFIX}${key}`,
      );
      setSavedExpandedKeys([...keys].map(String).concat(seenMarkers));
    },
    [allTypeGroupKeys, setSavedExpandedKeys],
  );

  const onExpandedChange = useCallback(
    (keys: Set<Key>) => {
      persistExpandedKeys(keys);
    },
    [persistExpandedKeys],
  );

  useEffect(() => {
    if (!savedExpandedKeys) {
      return;
    }
    const next = savedExpandedKeys
      .filter(key => !key.startsWith(SEEN_KEY_PREFIX))
      .concat(allTypeGroupKeys.map(key => `${SEEN_KEY_PREFIX}${key}`));
    const currentSet = new Set(savedExpandedKeys);
    const nextSet = new Set(next);
    const isSame =
      currentSet.size === nextSet.size &&
      [...currentSet].every(key => nextSet.has(key));
    if (!isSame) {
      setSavedExpandedKeys(next);
    }
  }, [allTypeGroupKeys, savedExpandedKeys, setSavedExpandedKeys]);

  /** Toggle a single key in the expanded set. */
  const toggleExpanded = useCallback(
    (key: string) => {
      const next = new Set(expandedKeysRef.current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      persistExpandedKeys(next);
    },
    [persistExpandedKeys],
  );

  /** Rename a type: update all accounts with the old type, then fix persisted keys. */
  const handleRenameType = useCallback(
    (nodeId: string, oldName: string, newName: string) => {
      const budgetPrefix = getBudgetPrefixFromTypeGroupKey(nodeId);
      const isOffBudgetGroup = budgetPrefix === OFF_BUDGET_KEY;
      const oldKey = getTypeGroupKey(budgetPrefix, oldName);
      const newKey = getTypeGroupKey(budgetPrefix, newName);
      const accountsToRename = accounts.filter(
        account =>
          account.type === oldName &&
          Boolean(account.offbudget) === isOffBudgetGroup,
      );

      // Update every account that has this type
      // TODO: switch to a batch account update endpoint when available to
      // avoid emitting one sync message per renamed account.
      for (const account of accountsToRename) {
        dispatch(updateAccount({ account: { ...account, type: newName } }));
      }

      // Update persisted type order
      setSavedTypeOrder(savedTypeOrder.map(k => (k === oldKey ? newKey : k)));

      // Update expanded keys
      const next = new Set(
        [...expandedKeysRef.current].map(k =>
          String(k) === oldKey ? newKey : String(k),
        ),
      );
      persistExpandedKeys(next);
    },
    [
      accounts,
      dispatch,
      savedTypeOrder,
      setSavedTypeOrder,
      persistExpandedKeys,
    ],
  );

  /** Delete a type: clear the type on all affected accounts and remove persisted keys. */
  const handleDeleteType = useCallback(
    (nodeId: string, typeName: string) => {
      const budgetPrefix = getBudgetPrefixFromTypeGroupKey(nodeId);
      const isOffBudgetGroup = budgetPrefix === OFF_BUDGET_KEY;
      const key = getTypeGroupKey(budgetPrefix, typeName);

      // Clear the type on every affected account
      for (const account of accounts) {
        if (
          account.type === typeName &&
          Boolean(account.offbudget) === isOffBudgetGroup
        ) {
          dispatch(updateAccount({ account: { ...account, type: null } }));
        }
      }

      // Remove from persisted type order
      setSavedTypeOrder(savedTypeOrder.filter(k => k !== key));

      // Remove from expanded keys
      const next = new Set(
        [...expandedKeysRef.current].filter(k => String(k) !== key),
      );
      persistExpandedKeys(next);
    },
    [
      accounts,
      dispatch,
      savedTypeOrder,
      setSavedTypeOrder,
      persistExpandedKeys,
    ],
  );

  // Find the account node for a given tree key
  function findAccountById(id: string): AccountEntity | undefined {
    return accounts.find(a => a.id === id);
  }

  // Find what type group a tree key belongs to
  function findTypeGroupForKey(key: Key): string | null {
    const keyStr = String(key);
    // Check if the key itself is a type group
    if (isTypeGroupKey(keyStr)) {
      return getTypeNameFromTypeGroupKey(keyStr);
    }
    return null;
  }

  /**
   * Compute the ordered list of type-group keys for a given budget
   * prefix from the current tree, so we can splice into it when
   * reordering.
   */
  const getTypeGroupKeysForPrefix = useCallback(
    (prefix: string): string[] => {
      const budgetNode = treeItems[0]?.children?.find(c => c.id === prefix);
      return (
        budgetNode?.children?.filter(c => c.isTypeGroup).map(c => c.id) ?? []
      );
    },
    [treeItems],
  );

  const getAccountSiblingIdsForTarget = useCallback(
    (targetAccountId: string): string[] => {
      const rootChildren = treeItems[0]?.children ?? [];
      for (const group of rootChildren) {
        const groupChildren = group.children ?? [];

        const untypedGroupIds = groupChildren
          .filter(node => !!node.account)
          .map(node => node.id);
        if (untypedGroupIds.includes(targetAccountId)) {
          return untypedGroupIds;
        }

        for (const node of groupChildren) {
          if (!node.isTypeGroup) {
            continue;
          }
          const typedGroupIds =
            node.children
              ?.filter(child => !!child.account)
              .map(child => child.id) ?? [];
          if (typedGroupIds.includes(targetAccountId)) {
            return typedGroupIds;
          }
        }
      }

      return accounts.map(account => account.id);
    },
    [accounts, treeItems],
  );

  function applyAccountTypeToItems(
    items: Iterable<{ kind: string }>,
    nextType: string | null,
  ) {
    for (const item of items) {
      if (isTextDragItem(item)) {
        item
          .getText('text/plain')
          .then(accountId => {
            const account = findAccountById(accountId);
            if (account) {
              dispatch(
                updateAccount({
                  account: { ...account, type: nextType },
                }),
              );
            }
          })
          .catch(error => {
            console.error('Unable to read dragged account id', error);
          });
      }
    }
  }

  // Track the keys currently being dragged so getDropOperation can
  // validate cross-budget drops.  Updated every time getItems fires
  // (i.e. at the start of each drag).
  const draggedKeysRef = useRef<Set<Key>>(new Set());

  const { dragAndDropHooks } = useDragAndDrop({
    getItems(keys) {
      draggedKeysRef.current = new Set(keys);
      // Only allow dragging accounts and type groups – not structural
      // nodes (all-accounts, onbudget, offbudget, closed).
      const draggable = [...keys].filter(
        key => !NON_DRAGGABLE_KEYS.has(String(key)),
      );
      return draggable.map(key => ({
        'text/plain': String(key),
      }));
    },
    onReorder(e) {
      const [key] = e.keys;
      const keyStr = String(key);
      const targetStr = String(e.target.key);
      const isTypeGroupDrag = isTypeGroupKey(keyStr);
      const isTypeGroupTarget = isTypeGroupKey(targetStr);

      // ── Type-group reorder ──
      if (isTypeGroupDrag && isTypeGroupTarget) {
        const prefix = getBudgetPrefixFromTypeGroupKey(keyStr);
        const currentOrder = getTypeGroupKeysForPrefix(prefix);
        const newOrder = currentOrder.filter(id => id !== keyStr);
        const targetIdx = newOrder.indexOf(targetStr);

        if (e.target.dropPosition === 'before') {
          newOrder.splice(targetIdx, 0, keyStr);
        } else {
          newOrder.splice(targetIdx + 1, 0, keyStr);
        }

        // Merge: keep order entries for other prefixes, replace for
        // this prefix.
        const otherEntries = savedTypeOrder.filter(
          id => !id.startsWith(prefix + TYPE_GROUP_SEPARATOR),
        );
        setSavedTypeOrder([...otherEntries, ...newOrder]);
        return;
      }

      // ── Account reorder ──
      if (!isTypeGroupDrag) {
        const accountId = keyStr;
        const targetAccountId = targetStr;

        if (e.target.dropPosition === 'before') {
          dispatch(moveAccount({ id: accountId, targetId: targetAccountId }));
        } else if (e.target.dropPosition === 'after') {
          const siblingIds = getAccountSiblingIdsForTarget(targetAccountId);
          const targetIdx = siblingIds.findIndex(id => id === targetAccountId);
          const nextAccountId =
            targetIdx >= 0 ? siblingIds[targetIdx + 1] : undefined;
          dispatch(
            moveAccount({
              id: accountId,
              targetId: nextAccountId || null,
            }),
          );
        }
      }
    },
    onItemDrop(e) {
      // Dropping onto a type group node changes the account's type
      if (e.target.dropPosition !== 'on') {
        return;
      }

      const targetKey = String(e.target.key);
      const typeName = findTypeGroupForKey(e.target.key);

      if (typeName) {
        applyAccountTypeToItems(e.items, typeName);
        return;
      }

      // Dropping directly on a budget group clears the type
      if (targetKey === ON_BUDGET_KEY || targetKey === OFF_BUDGET_KEY) {
        applyAccountTypeToItems(e.items, null);
      }
    },
    acceptedDragTypes: ['text/plain'],
    getDropOperation(target) {
      if (!('key' in target)) {
        return 'cancel';
      }
      const key = String(target.key);

      // Allow dropping ON type groups and budget groups (changes the
      // account's type or clears it).
      if (
        target.dropPosition === 'on' &&
        (isTypeGroupKey(key) || key === ON_BUDGET_KEY || key === OFF_BUDGET_KEY)
      ) {
        // Validate cross-budget drops: prevent dropping an account from
        // one budget group onto the opposite budget group header.
        // The offbudget status is immutable via drag-and-drop, so show
        // no drop indicator for invalid targets.
        if (key === ON_BUDGET_KEY || key === OFF_BUDGET_KEY) {
          const isTargetOffBudget = key === OFF_BUDGET_KEY;
          for (const draggedKey of draggedKeysRef.current) {
            const draggedKeyStr = String(draggedKey);
            if (
              !isTypeGroupKey(draggedKeyStr) &&
              !NON_DRAGGABLE_KEYS.has(draggedKeyStr)
            ) {
              const account = findAccountById(draggedKeyStr);
              if (
                account &&
                Boolean(account.offbudget) !== isTargetOffBudget
              ) {
                return 'cancel';
              }
            }
          }
        }
        return 'move';
      }

      // Allow reorder between type-group siblings (before / after)
      if (isTypeGroupKey(key) && target.dropPosition !== 'on') {
        return 'move';
      }

      // Allow reorder between account siblings (before / after)
      const account = findAccountById(key);
      if (account && target.dropPosition !== 'on') {
        return 'move';
      }

      return 'cancel';
    },
  });

  return (
    <View
      style={{
        flexGrow: 1,
        '@media screen and (max-height: 480px)': {
          minHeight: 'auto',
        },
      }}
    >
      <View
        style={{
          height: 1,
          backgroundColor: theme.sidebarItemBackgroundHover,
          marginTop: 15,
          flexShrink: 0,
        }}
      />

      <View style={{ overflow: 'auto' }}>
        <Tree
          aria-label={t('Accounts')}
          items={treeItems}
          expandedKeys={expandedKeys}
          onExpandedChange={onExpandedChange}
          dragAndDropHooks={dragAndDropHooks}
          selectionMode="none"
          className={css({
            // Remove default tree styling
            outline: 'none',
            padding: 0,
            margin: 0,
            listStyle: 'none',
            '& [role="treeitem"]': {
              outline: 'none',
              listStyle: 'none',
            },
            '& [role="group"]': {
              padding: 0,
              margin: 0,
              listStyle: 'none',
            },
            // ── Drag-and-drop visual feedback ──
            // Highlight a tree row when it is a valid "drop on" target
            // (e.g. dropping an account onto a type group).
            '& [role="row"][data-drop-target]': {
              backgroundColor: theme.sidebarItemBackgroundHover,
              boxShadow: `inset 0 0 0 1px ${theme.sidebarItemAccentSelected}`,
              borderRadius: 4,
            },
            // Between-item drop indicator line (before / after).
            // react-aria renders DropIndicators as zero-height divs;
            // reset all their default styling and only show a thin
            // coloured line when they are the active drop target.
            '& .react-aria-DropIndicator': {
              outline: 'none',
              border: 'none',
              margin: 0,
              padding: 0,
              height: 0,
              background: 'none',
            },
            '& .react-aria-DropIndicator[data-drop-target]': {
              height: 1,
              backgroundColor: theme.sidebarItemAccentSelected,
            },
          })}
        >
          {function renderTreeItem(node: TreeNode) {
            // Account leaf node
            if (node.account) {
              return (
                <TreeItem key={node.id} id={node.id} textValue={node.name}>
                  <TreeItemContent>
                    <Account
                      name={node.account.name}
                      account={node.account}
                      connected={!!node.account.bank}
                      pending={syncingAccountIds.includes(node.account.id)}
                      failed={failedAccounts.has(node.account.id)}
                      updated={updatedAccounts.includes(node.account.id)}
                      to={`/accounts/${node.account.id}`}
                      query={bindings.accountBalance(node.account.id)}
                    />
                    <AriaButton slot="drag" style={visuallyHiddenStyle}>
                      ≡
                    </AriaButton>
                  </TreeItemContent>
                </TreeItem>
              );
            }

            // Type group header — compact row with a collapse/expand chevron
            // and right-click context menu for Rename / Delete.
            if (node.isTypeGroup) {
              return (
                <TreeItem key={node.id} id={node.id} textValue={node.name}>
                  <TreeItemContent>
                    {({ isExpanded }) => (
                      <>
                        <AriaButton
                          slot="chevron"
                          style={visuallyHiddenStyle}
                        />
                        <AriaButton slot="drag" style={visuallyHiddenStyle}>
                          ≡
                        </AriaButton>
                        <TypeGroupHeader
                          node={node}
                          isExpanded={isExpanded}
                          onToggle={() => toggleExpanded(node.id)}
                          onRename={newName =>
                            handleRenameType(node.id, node.name, newName)
                          }
                          onDelete={() => handleDeleteType(node.id, node.name)}
                          query={node.query}
                        />
                      </>
                    )}
                  </TreeItemContent>
                  {node.children && (
                    <Collection items={node.children}>
                      {renderTreeItem}
                    </Collection>
                  )}
                </TreeItem>
              );
            }

            // Root "All Accounts" or budget group nodes
            const isRoot = node.id === ALL_ACCOUNTS_KEY;
            return (
              <TreeItem key={node.id} id={node.id} textValue={node.name}>
                <TreeItemContent>
                  {({ isExpanded }) => (
                    <>
                      <AriaButton slot="chevron" style={visuallyHiddenStyle} />
                      {node.to && node.query ? (
                        <AccountGroupHeader
                          name={node.name}
                          to={node.to}
                          query={node.query}
                          isRoot={isRoot}
                          isExpanded={isExpanded}
                          onToggle={() => toggleExpanded(node.id)}
                        />
                      ) : (
                        <View
                          style={{
                            fontWeight,
                            color: theme.sidebarItemText,
                            padding: '14px 10px 10px',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <ExpandChevron
                            isExpanded={isExpanded}
                            onToggle={() => toggleExpanded(node.id)}
                          />
                          {node.name}
                        </View>
                      )}
                    </>
                  )}
                </TreeItemContent>
                {node.children && (
                  <Collection items={node.children}>
                    {renderTreeItem}
                  </Collection>
                )}
              </TreeItem>
            );
          }}
        </Tree>
      </View>
    </View>
  );
}

/**
 * TODO: Extract sidebar tree components into dedicated files as this module grows.
 * Chevron that toggles the expanded/collapsed state of a tree node.
 * Uses a plain `<button>` with an explicit `onToggle` callback so we
 * bypass the react-aria slot mechanism (which doesn't reliably fire
 * in all configurations) and directly update `expandedKeys`.
 */
function ExpandChevron({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-label={isExpanded ? t('Collapse') : t('Expand')}
      onPointerDownCapture={e => {
        e.stopPropagation();
      }}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={e => e.stopPropagation()}
      style={{
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        width: 12,
        height: 12,
      }}
    >
      {isExpanded ? (
        <SvgCheveronDown width={12} height={12} />
      ) : (
        <SvgCheveronRight width={12} height={12} />
      )}
    </button>
  );
}

/**
 * Budget group / root header with a chevron, navigable link, and
 * aggregate balance.
 *
 * The chevron calls `onToggle` to expand/collapse.  Clicking the text
 * navigates to the aggregate account page.  `onPointerDown`
 * propagation is stopped on the outer container so the tree-row press
 * handler never fires – this ensures that only the chevron controls
 * expansion.
 */
function AccountGroupHeader<FieldName extends SheetFields<'account'>>({
  name,
  to,
  query,
  isRoot,
  isExpanded,
  onToggle,
}: {
  name: string;
  to?: string;
  query: Binding<'account', FieldName>;
  isRoot?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const match = useMatch({ path: to || '', end: !!isRoot });

  const wrapperStyle = {
    ...styles.smallText,
    fontWeight,
    color: match ? theme.sidebarItemTextSelected : theme.sidebarItemText,
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 15,
    paddingLeft: 4,
    marginTop: isRoot ? 15 : 13,
    marginBottom: isRoot ? 0 : 5,
    ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
    borderLeft: `4px solid ${match ? theme.sidebarItemAccentSelected : 'transparent'}`,
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
  };

  const textContent = (
    <AlignedText
      style={{
        borderBottom: `1.5px solid ${theme.tableBorder}`,
        paddingBottom: '3px',
      }}
      left={name}
      right={<CellValue binding={query} type="financial" />}
    />
  );

  return (
    <View onPointerDown={e => e.stopPropagation()} style={wrapperStyle}>
      <ExpandChevron isExpanded={isExpanded} onToggle={onToggle} />
      {to ? (
        <Link
          variant="internal"
          to={to}
          style={{
            flex: 1,
            minWidth: 0,
            textDecoration: 'none' as const,
            color: 'inherit',
          }}
        >
          {textContent}
        </Link>
      ) : (
        <View style={{ flex: 1, minWidth: 0 }}>{textContent}</View>
      )}
    </View>
  );
}

/**
 * Type group header with a collapse/expand chevron, inline rename, and
 * a right-click context menu offering Rename and Delete.
 *
 * - **Rename** replaces the type name on all accounts in this group.
 * - **Delete** clears the type (sets to null) on all accounts in this group.
 */
function TypeGroupHeader<FieldName extends SheetFields<'account'>>({
  node,
  isExpanded,
  onToggle,
  onRename,
  onDelete,
  query,
}: {
  node: TreeNode;
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  query?: Binding<'account', FieldName>;
}) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLDivElement>(null);
  const { setMenuOpen, menuOpen, handleContextMenu, position } =
    useContextMenu();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraftValue, setRenameDraftValue] = useState(node.name);
  const hasSubmittedRenameRef = useRef(false);
  const isEventInsidePopover = (target: EventTarget | null) =>
    target instanceof HTMLElement && !!target.closest('[data-popover]');

  function submitRename(rawValue: string) {
    if (hasSubmittedRenameRef.current) {
      return;
    }

    hasSubmittedRenameRef.current = true;
    const trimmedValue = rawValue.trim();
    if (trimmedValue !== '' && trimmedValue !== node.name) {
      onRename(trimmedValue);
    }
  }

  return (
    <View
      innerRef={triggerRef}
      onContextMenu={handleContextMenu}
      onPointerDownCapture={e => {
        if (isEventInsidePopover(e.target)) {
          return;
        }
        e.stopPropagation();
      }}
      onPointerDown={e => {
        if (isEventInsidePopover(e.target)) {
          return;
        }
        e.stopPropagation();
      }}
      onClick={e => {
        if (!isRenaming && !isEventInsidePopover(e.target)) {
          onToggle();
        }
      }}
      style={{
        ...styles.smallText,
        color: theme.sidebarItemText,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 4,
        paddingRight: 15,
        marginTop: 3,
        marginBottom: 1,
        textTransform: 'uppercase',
        borderLeft: '4px solid transparent',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <ExpandChevron isExpanded={isExpanded} onToggle={onToggle} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: 1 }}>
        <AlignedText
          left={node.name}
          right={
            query ? (
              <span style={{ fontStyle: 'italic', textDecoration: 'underline' }}>
                <CellValue binding={query} type="financial" />
              </span>
            ) : null
          }
        />
      </View>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
        style={{ width: 200, margin: 1 }}
        isNonModal
        {...position}
      >
        <Menu
          onMenuSelect={menuAction => {
            switch (menuAction) {
              case 'rename': {
                hasSubmittedRenameRef.current = false;
                setRenameDraftValue(node.name);
                setIsRenaming(true);
                break;
              }
              case 'delete': {
                onDelete();
                break;
              }
              default: {
                throw new Error(`Unrecognized menu option: ${menuAction}`);
              }
            }
            setMenuOpen(false);
          }}
          items={[
            { name: 'rename', text: t('Rename') },
            { name: 'delete', text: t('Delete') },
          ]}
        />
      </Popover>
      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={isRenaming}
        onOpenChange={nextOpen => {
          if (!nextOpen) {
            submitRename(renameDraftValue);
            setIsRenaming(false);
          }
        }}
        style={{ width: 200, padding: 5 }}
        isNonModal
        {...position}
      >
        <AccountTypeAutocomplete
          value={renameDraftValue}
          embedded
          onUpdate={(_id, rawInputValue) => {
            setRenameDraftValue(rawInputValue);
          }}
          onSelect={(newType, rawInputValue) => {
            submitRename(newType ?? rawInputValue);
            setIsRenaming(false);
          }}
        />
      </Popover>
    </View>
  );
}
