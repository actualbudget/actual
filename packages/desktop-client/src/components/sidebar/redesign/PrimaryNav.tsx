import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { getSidebarMenuItemPath } from '#components/sidebar/sidebarMenu';
import { useSidebarMenuItemDetails } from '#components/sidebar/useSidebarMenuItemDetails';
import { useSidebarMenu } from '#hooks/useSidebarMenu';

import { NavRow } from './NavRow';

export function PrimaryNav() {
  const { sidebarItems } = useSidebarMenu();
  const itemDetails = useSidebarMenuItemDetails();

  return (
    <View
      data-testid="sidebar-primary-buttons"
      style={{
        flexShrink: 0,
        padding: `${spacing.xs}px ${spacing.sm}px 0`,
      }}
    >
      {sidebarItems.map(item => (
        <NavRow
          key={item.id}
          title={itemDetails[item.id].title}
          Icon={itemDetails[item.id].Icon}
          to={getSidebarMenuItemPath(item.id, true)}
        />
      ))}
    </View>
  );
}
