export type SidebarSide = 'on' | 'off';

export type SidebarDropTargetId =
  | `account:${string}`
  | `group:${string}`
  | `ungrouped:${SidebarSide}`;

export type SidebarDropTarget =
  | { kind: 'account'; accountId: string }
  | { kind: 'group'; groupId: string }
  | { kind: 'ungrouped'; side: SidebarSide };

export const dropTargets = {
  account(accountId: string): SidebarDropTargetId {
    return `account:${accountId}`;
  },
  group(groupId: string): SidebarDropTargetId {
    return `group:${groupId}`;
  },
  ungrouped(side: SidebarSide): SidebarDropTargetId {
    return `ungrouped:${side}`;
  },
};

export function parseDropTarget(id: string): SidebarDropTarget | null {
  if (id.startsWith('account:')) {
    return { kind: 'account', accountId: id.slice('account:'.length) };
  }
  if (id.startsWith('group:')) {
    return { kind: 'group', groupId: id.slice('group:'.length) };
  }
  if (id === 'ungrouped:on' || id === 'ungrouped:off') {
    return { kind: 'ungrouped', side: id === 'ungrouped:on' ? 'on' : 'off' };
  }
  return null;
}
