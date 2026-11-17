import type { Key } from 'react-aria-components';

export type SidebarTreeKey = `account:${string}` | `group:${string}`;

export type SidebarTreeNode =
  | { kind: 'account'; accountId: string }
  | { kind: 'group'; groupId: string };

export const treeKeys = {
  account(accountId: string): SidebarTreeKey {
    return `account:${accountId}`;
  },
  group(groupId: string): SidebarTreeKey {
    return `group:${groupId}`;
  },
};

export function parseTreeKey(key: Key): SidebarTreeNode | null {
  if (typeof key !== 'string') {
    return null;
  }
  if (key.startsWith('account:')) {
    return { kind: 'account', accountId: key.slice('account:'.length) };
  }
  if (key.startsWith('group:')) {
    return { kind: 'group', groupId: key.slice('group:'.length) };
  }
  return null;
}
