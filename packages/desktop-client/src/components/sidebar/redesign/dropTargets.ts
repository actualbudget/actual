export type SidebarDropTargetId = `account:${string}` | `group:${string}`;

export type SidebarDropTarget =
  | { kind: 'account'; accountId: string }
  | { kind: 'group'; groupId: string };

export const dropTargets = {
  account(accountId: string): SidebarDropTargetId {
    return `account:${accountId}`;
  },
  group(groupId: string): SidebarDropTargetId {
    return `group:${groupId}`;
  },
};

export function parseDropTarget(id: string): SidebarDropTarget | null {
  if (id.startsWith('account:')) {
    return { kind: 'account', accountId: id.slice('account:'.length) };
  }
  if (id.startsWith('group:')) {
    return { kind: 'group', groupId: id.slice('group:'.length) };
  }
  return null;
}
