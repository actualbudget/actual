import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { Page } from '#components/Page';
import { SettingsPageTitle } from '#components/settings/SettingsPageTitle';
import { useSidebarMenu } from '#hooks/useSidebarMenu';

import {
  getSidebarMenuItemPath,
  isSettingsSectionOnMobile,
} from './sidebarMenu';
import type { SettingsSectionId } from './sidebarMenu';
import { useSidebarMenuItemDetails } from './useSidebarMenuItemDetails';

type SidebarMenuRouteProps = {
  id: SettingsSectionId;
  isInSettings?: boolean;
  children: ReactNode;
};

export function SidebarMenuRoute({
  id,
  isInSettings = false,
  children,
}: SidebarMenuRouteProps) {
  const { isNarrowWidth } = useResponsive();
  const { sidebarItems } = useSidebarMenu();
  const itemDetails = useSidebarMenuItemDetails();
  const location = useLocation();

  const isMobilePage = isNarrowWidth && !isSettingsSectionOnMobile(id);
  const isSettingsPage = isNarrowWidth
    ? !isMobilePage
    : !sidebarItems.some(item => item.id === id);

  if (isSettingsPage !== isInSettings) {
    return (
      <Navigate
        to={{
          pathname: getSidebarMenuItemPath(id, isInSettings),
          search: location.search,
          hash: location.hash,
        }}
        state={location.state}
        replace
      />
    );
  }

  if (isMobilePage || (isInSettings && isNarrowWidth)) {
    return children;
  }

  if (isInSettings) {
    return (
      <View style={{ flex: 1, minHeight: 0, gap: spacing.lg }}>
        <SettingsPageTitle>{itemDetails[id].title}</SettingsPageTitle>
        {children}
      </View>
    );
  }

  return (
    <Page header={itemDetails[id].title}>
      <View style={{ flex: 1, minHeight: 0, paddingTop: spacing.md }}>
        {children}
      </View>
    </Page>
  );
}
