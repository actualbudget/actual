import { useLocalPref } from '#hooks/useLocalPref';

import type { GroupBucket, SidebarAccountTree } from './useSidebarAccountTree';

type Side = 'on' | 'off';

export type SidebarSectionKey =
  | 'onbudget'
  | 'offbudget'
  | 'closed'
  | `group-${string}-${Side}`
  | `ungrouped-${Side}`;

export function bucketKey(side: Side, bucket: GroupBucket): SidebarSectionKey {
  return bucket.group
    ? `group-${bucket.group.id}-${side}`
    : `ungrouped-${side}`;
}

type UseSidebarCollapseStateArgs = {
  tree: SidebarAccountTree;
  isSearching: boolean;
};

export function useSidebarCollapseState({
  tree,
  isSearching,
}: UseSidebarCollapseStateArgs): {
  isOpen: (key: SidebarSectionKey) => boolean;
  toggle: (key: SidebarSectionKey) => void;
  allOpen: boolean;
  toggleAll: () => void;
} {
  const [openState = {}, setOpenState] = useLocalPref(
    'sidebar.accountsOpenState',
  );

  const isOpen = (key: SidebarSectionKey) =>
    isSearching ? true : (openState[key] ?? key !== 'closed');
  const toggle = (key: SidebarSectionKey) =>
    setOpenState({ ...openState, [key]: !isOpen(key) });

  const allKeys: SidebarSectionKey[] = [
    'onbudget',
    'offbudget',
    ...tree.onBudget.buckets
      .filter(bucket => bucket.group != null)
      .map(bucket => bucketKey('on', bucket)),
    ...tree.offBudget.buckets
      .filter(bucket => bucket.group != null)
      .map(bucket => bucketKey('off', bucket)),
  ];
  const allOpen = allKeys.every(isOpen);
  const toggleAll = () =>
    setOpenState({
      ...openState,
      ...Object.fromEntries(allKeys.map(key => [key, !allOpen])),
    });

  return { isOpen, toggle, allOpen, toggleAll };
}
