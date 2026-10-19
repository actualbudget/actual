export const SIDEBAR_MENU_ITEM_IDS = [
  'budget',
  'reports',
  'schedules',
  'payees',
  'tags',
  'rules',
  'bank-sync',
] as const;

export type SidebarMenuItemId = (typeof SIDEBAR_MENU_ITEM_IDS)[number];

export type SidebarMenuItem = {
  id: SidebarMenuItemId;
  hidden: boolean;
};

const SETTINGS_SECTION_IDS = [
  'schedules',
  'payees',
  'tags',
  'rules',
  'bank-sync',
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export function isSettingsSection(
  id: SidebarMenuItemId,
): id is SettingsSectionId {
  return SETTINGS_SECTION_IDS.some(sectionId => sectionId === id);
}

export function isSidebarMenuItemLocked(id: SidebarMenuItemId): boolean {
  return !isSettingsSection(id);
}

export function isSettingsSectionOnMobile(id: SettingsSectionId): boolean {
  return id !== 'schedules';
}

export function isInMobileSettingsNav(id: SettingsSectionId): boolean {
  return isSettingsSectionOnMobile(id) && id !== 'tags';
}

function isHiddenByDefault(id: SidebarMenuItemId): boolean {
  return isSettingsSection(id) && id !== 'schedules';
}

function isKnownItemId(id: unknown): id is SidebarMenuItemId {
  return SIDEBAR_MENU_ITEM_IDS.some(itemId => itemId === id);
}

export function getDefaultSidebarMenuItems(): SidebarMenuItem[] {
  return SIDEBAR_MENU_ITEM_IDS.map(id => ({
    id,
    hidden: isHiddenByDefault(id),
  }));
}

export function getSidebarMenuItemPath(
  id: SidebarMenuItemId,
  isInSidebar: boolean,
): string {
  return isSettingsSection(id) && !isInSidebar ? `/settings/${id}` : `/${id}`;
}

export function parseSidebarMenuItems(
  raw: string | undefined,
): SidebarMenuItem[] {
  let saved: SidebarMenuItem[] = [];

  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (
            entry &&
            typeof entry === 'object' &&
            'id' in entry &&
            isKnownItemId(entry.id) &&
            !saved.some(item => item.id === entry.id)
          ) {
            saved.push({
              id: entry.id,
              hidden:
                'hidden' in entry &&
                entry.hidden === true &&
                !isSidebarMenuItemLocked(entry.id),
            });
          }
        }
      }
    } catch {
      saved = [];
    }
  }

  for (const [defaultIdx, item] of getDefaultSidebarMenuItems().entries()) {
    if (saved.some(savedItem => savedItem.id === item.id)) {
      continue;
    }
    const insertAt = saved.findIndex(
      savedItem => SIDEBAR_MENU_ITEM_IDS.indexOf(savedItem.id) > defaultIdx,
    );
    if (insertAt === -1) {
      saved.push(item);
    } else {
      saved.splice(insertAt, 0, item);
    }
  }

  return saved;
}

export function parseSidebarStartPage(
  raw: string | undefined,
  items: SidebarMenuItem[],
): SidebarMenuItemId {
  return (items.find(item => item.id === raw) ?? items[0]).id;
}

export function moveSidebarMenuItem(
  items: SidebarMenuItem[],
  movedId: string,
  targetId: string,
  dropPosition: 'before' | 'after' | 'on',
): SidebarMenuItem[] {
  const moved = items.find(item => item.id === movedId);
  if (!moved || movedId === targetId) {
    return items;
  }

  const remaining = items.filter(item => item.id !== movedId);
  const targetIdx = remaining.findIndex(item => item.id === targetId);
  if (targetIdx === -1) {
    return items;
  }

  const insertAt = dropPosition === 'after' ? targetIdx + 1 : targetIdx;
  return [...remaining.slice(0, insertAt), moved, ...remaining.slice(insertAt)];
}
