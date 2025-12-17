import {
  useRef,
  useState,
  type RefObject,
  type ReactNode,
  type ComponentProps,
  useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { View } from '@actual-app/components/view';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';

import { useDashboards } from '@desktop-client/hooks/useDashboard';

type DashboardMoveMenuProps = {
  onSelect: (dashboardId: string) => void;
};

export function DashboardMoveMenu({ onSelect }: DashboardMoveMenuProps) {
  const { data: dashboards } = useDashboards();
  const [searchParams] = useSearchParams();

  // TODO: Maybe we don't need to get the current dashboard from the URL params? It would be viable (and maybe even a desirable UX) for a user to copy a widget to the same dashboard they are currently on?
  const dashboardIdParam = searchParams.get('dashboardId');
  // When no dashboardId is in URL, the active dashboard is the first one
  const currentDashboardId = useMemo(
    () => dashboardIdParam ?? dashboards[0]?.id,
    [dashboardIdParam, dashboards],
  );

  const items: ComponentProps<typeof Menu>['items'] = dashboards
    .filter(d => d.id !== currentDashboardId)
    .map(d => ({
      name: d.id,
      text: d.name,
    }));

  return (
    <Menu
      className={NON_DRAGGABLE_AREA_CLASS_NAME}
      items={items}
      onMenuSelect={item => onSelect(item as string)}
    />
  );
}

type WidgetMoveMenuResult = {
  /** Whether the move menu popover is open */
  isOpen: boolean;
  /** Whether clicking on the card should be disabled (when menu is open) */
  disableClick: boolean;
  /** Menu items to add to the card's menu */
  menuItems: ComponentProps<typeof Menu>['items'];
  /** Handler for menu selection - call this from onMenuSelect */
  handleMenuSelect: (item: string) => boolean;
  /** Component to render the move menu popover - place inside ReportCard children */
  MoveMenuPopover: () => ReactNode;
};

/**
 * Hook to handle the move/copy widget functionality for dashboard cards.
 * Extracts the common pattern of move/copy menu items and popover logic.
 *
 * @param onMove - Callback when a widget is moved/copied to another dashboard
 * @returns Object with menu items, handlers, and the popover component
 *
 * @example
 * ```tsx
 * function MyCard({ onMove, onRemove }) {
 *   const { menuItems, handleMenuSelect, MoveMenuPopover, disableClick } = useWidgetMoveMenu(onMove);
 *
 *   return (
 *     <ReportCard
 *       disableClick={disableClick || otherCondition}
 *       menuItems={[
 *         { name: 'rename', text: t('Rename') },
 *         { name: 'remove', text: t('Remove') },
 *         ...menuItems,
 *       ]}
 *       onMenuSelect={item => {
 *         if (handleMenuSelect(item)) return;
 *         // handle other items...
 *       }}
 *     >
 *       <MoveMenuPopover />
 *       {children}
 *     </ReportCard>
 *   );
 * }
 * ```
 */
export function useWidgetMoveMenu(
  onMove: (targetDashboardId: string, copy: boolean) => void,
): WidgetMoveMenuResult {
  const { t } = useTranslation();

  // Store a callback that will be called when user selects a dashboard
  // This pattern allows us to distinguish between move (copy=false) and copy (copy=true)
  const [moveCallback, setMoveCallback] = useState<
    ((targetDashboardId: string) => void) | null
  >(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const isOpen = moveCallback !== null;

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
        setMoveCallback(() => (targetDashboardId: string) => {
          onMove(targetDashboardId, false);
        });
        return true;
      case 'copy-to-dashboard':
        setMoveCallback(() => (targetDashboardId: string) => {
          onMove(targetDashboardId, true);
        });
        return true;
      default:
        return false;
    }
  };

  const closeMenu = () => setMoveCallback(null);

  const MoveMenuPopover = () => (
    <>
      {/* Hidden trigger element for the popover */}
      <View
        ref={triggerRef as RefObject<HTMLDivElement>}
        style={{ position: 'absolute', top: 0, right: 0 }}
      />
      <Popover
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={closeMenu}
        placement="bottom start"
      >
        <DashboardMoveMenu
          onSelect={targetDashboardId => {
            if (moveCallback === null) return;
            moveCallback(targetDashboardId);
            closeMenu();
          }}
        />
      </Popover>
    </>
  );

  return {
    isOpen,
    disableClick: isOpen,
    menuItems,
    handleMenuSelect,
    MoveMenuPopover,
  };
}
