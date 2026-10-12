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
import { saveSyncedPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

export function useSidebarMenu() {
  const dispatch = useDispatch();
  const [itemsPref] = useSyncedPref('sidebar-menu-items');
  const [startPagePref] = useSyncedPref('sidebar-start-page');
  const syncServerStatus = useSyncServerStatus();
  const isTestEnv = useIsTestEnv();
  const isUsingServer = syncServerStatus !== 'no-server' || isTestEnv;

  const items = parseSidebarMenuItems(itemsPref);
  const startPage = parseSidebarStartPage(startPagePref, items);

  const isItemAvailable = (id: SidebarMenuItemId) =>
    id !== 'bank-sync' || isUsingServer;
  const isInSidebar = (id: SidebarMenuItemId) =>
    !items.find(item => item.id === id)?.hidden;

  const sidebarItems = items.filter(
    item => !item.hidden && isItemAvailable(item.id),
  );
  const settingsItems = items.filter(
    item => item.hidden && isItemAvailable(item.id),
  );

  const startItem =
    sidebarItems.find(item => item.id === startPage) ?? sidebarItems[0];
  const startPath = startItem
    ? getSidebarMenuItemPath(startItem.id, true)
    : '/budget';

  const saveMenu = (
    newItems: SidebarMenuItem[],
    newStartPage: SidebarMenuItemId,
  ) => {
    void dispatch(
      saveSyncedPrefs({
        prefs: {
          'sidebar-menu-items': JSON.stringify(newItems),
          'sidebar-start-page': newStartPage,
        },
      }),
    );
  };

  return {
    items,
    startPage,
    sidebarItems,
    settingsItems,
    startPath,
    isItemAvailable,
    isInSidebar,
    saveMenu,
  };
}
