import { type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { type Menu } from '@actual-app/components/menu';

import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type WidgetMoveMenuResult = {
  /** Menu items to add to the card's menu */
  menuItems: ComponentProps<typeof Menu>['items'];
  /** Handler for menu selection - call this from onMenuSelect */
  handleMenuSelect: (item: string) => boolean;
};

export function useWidgetMoveMenu(
  onMove: (targetDashboardId: string, copy: boolean) => void,
): WidgetMoveMenuResult {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const menuItems: ComponentProps<typeof Menu>['items'] = [
    {
      name: 'move-to-dashboard',
      text: t('Move to dashboard'),
    },
    {
      name: 'copy-to-dashboard',
      text: t('Copy to dashboard'),
    },
  ];

  const handleMenuSelect = (item: string): boolean => {
    switch (item) {
      case 'move-to-dashboard':
        dispatch(
          pushModal({
            modal: {
              name: 'move-widget-to-dashboard',
              options: {
                action: 'move',
                onSelect: targetDashboardId => {
                  onMove(targetDashboardId, false);
                },
              },
            },
          }),
        );
        return true;
      case 'copy-to-dashboard':
        dispatch(
          pushModal({
            modal: {
              name: 'move-widget-to-dashboard',
              options: {
                action: 'copy',
                onSelect: targetDashboardId => {
                  onMove(targetDashboardId, true);
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
