import type { SyncedPrefs } from '@actual-app/core/types/prefs';

import {
  getSidebarMenuItemPath,
  parseSidebarMenuItems,
  parseSidebarStartPage,
} from '#components/sidebar/sidebarMenu';
import type {
  SidebarMenuItem,
  SidebarMenuItemId,
} from '#components/sidebar/sidebarMenu';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { mergeSyncedPrefs, saveSyncedPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

export function useSidebarMenu() {
  const dispatch = useDispatch();
  const [itemsPref] = useSyncedPref('sidebar-menu-items');
  const [startPagePref] = useSyncedPref('sidebar-start-page');
  const syncServerStatus = useSyncServerStatus();
  const isTestEnv = useIsTestEnv();
  const isUsingServer = syncServerStatus !== 'no-server' || isTestEnv;

  const isItemAvailable = (id: SidebarMenuItemId) =>
    id !== 'bank-sync' || isUsingServer;

  const items = parseSidebarMenuItems(itemsPref);
  const availableItems = items.filter(item => isItemAvailable(item.id));
  const sidebarItems = availableItems.filter(item => !item.hidden);
  const settingsItems = availableItems.filter(item => item.hidden);

  const startPage = parseSidebarStartPage(startPagePref, availableItems);
  const startPath = getSidebarMenuItemPath(
    startPage,
    sidebarItems.some(item => item.id === startPage),
  );

  const savePrefs = (prefs: Partial<SyncedPrefs>) => {
    dispatch(mergeSyncedPrefs(prefs));
    void dispatch(saveSyncedPrefs({ prefs }));
  };

  const saveItems = (newItems: SidebarMenuItem[]) => {
    savePrefs({ 'sidebar-menu-items': JSON.stringify(newItems) });
  };

  const saveStartPage = (newStartPage: SidebarMenuItemId) => {
    savePrefs({ 'sidebar-start-page': newStartPage });
  };

  return {
    items,
    availableItems,
    sidebarItems,
    settingsItems,
    startPage,
    startPath,
    isItemAvailable,
    saveItems,
    saveStartPage,
  };
}
