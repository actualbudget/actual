import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import type { Menu } from '@actual-app/components/menu';

import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type DashboardWidgetCopyMenuResult = {
  /** Menu items to add to the card's menu */
  menuItems: ComponentProps<typeof Menu<string>>['items'];
  /** Handler for menu selection - call this from onMenuSelect */
  handleMenuSelect: (item: string) => boolean;
};

export function useDashboardWidgetCopyMenu(
  onCopy: (targetDashboardId: string) => void,
): DashboardWidgetCopyMenuResult {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const menuItems: ComponentProps<typeof Menu<string>>['items'] = [
    {
      name: 'copy-to-dashboard',
      text: t('Copy to dashboard'),
    },
  ];

  const handleMenuSelect = (item: string): boolean => {
    switch (item) {
      case 'copy-to-dashboard':
        dispatch(
          pushModal({
            modal: {
              name: 'copy-widget-to-dashboard',
              options: {
                onSelect: targetDashboardId => {
                  onCopy(targetDashboardId);
                },
              },
            },
          }),
        );
        return true;
      default:
        return false;
    }
  };

  return {
    menuItems,
    handleMenuSelect,
  };
}
