import React from 'react';
import { useTranslation } from 'react-i18next';

import { SvgCog } from '@actual-app/components/icons/v1';
import { View } from '@actual-app/components/view';

import { useSidebarMenu } from '#hooks/useSidebarMenu';

import { Item } from './Item';
import { getSidebarMenuItemPath } from './sidebarMenu';
import { useSidebarMenuItemDetails } from './useSidebarMenuItemDetails';

export function PrimaryButtons() {
  const { t } = useTranslation();
  const { sidebarItems } = useSidebarMenu();
  const itemDetails = useSidebarMenuItemDetails();

  return (
    <View data-testid="sidebar-primary-buttons" style={{ flexShrink: 0 }}>
      {sidebarItems.map(item => (
        <Item
          key={item.id}
          title={itemDetails[item.id].title}
          Icon={itemDetails[item.id].Icon}
          to={getSidebarMenuItemPath(item.id, true)}
        />
      ))}
      <Item title={t('Settings')} Icon={SvgCog} to="/settings" />
    </View>
  );
}
