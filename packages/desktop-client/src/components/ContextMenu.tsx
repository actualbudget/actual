import { useEffect, useRef } from 'react';

import {
  HOVER_MENU_CLOSE_DELAY,
  isPointInsideRect,
} from '@actual-app/components/hooks/useHoverMenu';
import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';

import { closeContextMenu } from '#contextmenu/contextMenuSlice';
import { useRefEventListener } from '#hooks/useRefEventListener';
import { useDispatch, useSelector } from '#redux';

export function ContextMenu() {
  const dispatch = useDispatch();
  const { isOpen, position, items, hoverTrigger } = useSelector(
    state => state.contextMenu,
  );

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      dispatch(closeContextMenu());
    }
  }

  // Handle left-clicks and right-clicks to DISMISS the menu
  useRefEventListener(document, 'pointerdown', (e: PointerEvent) => {
    // Close the menu if we click anywhere outside the popover DOM element
    if (
      isOpen &&
      popoverRef.current &&
      !popoverRef.current.contains(e.target as Node)
    ) {
      handleOpenChange(false);
    }
  });

  // A menu that was opened by hovering its trigger closes again once the
  // pointer has left both the trigger and the menu for a moment. Menus opened
  // explicitly (click / right-click) have no hover trigger and stay open.
  useEffect(() => {
    if (!isOpen || !hoverTrigger) {
      return;
    }

    let closeTimer: ReturnType<typeof setTimeout> | null = null;
    const clearCloseTimer = () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    };
    const scheduleClose = () => {
      if (closeTimer) return;
      closeTimer = setTimeout(() => {
        closeTimer = null;
        dispatch(closeContextMenu());
      }, HOVER_MENU_CLOSE_DELAY);
    };

    const onPointerMove = (event: PointerEvent) => {
      const isInside =
        isPointInsideRect(hoverTrigger, event.clientX, event.clientY) ||
        isPointInsideRect(
          popoverRef.current?.getBoundingClientRect(),
          event.clientX,
          event.clientY,
        );
      if (isInside) {
        clearCloseTimer();
      } else {
        scheduleClose();
      }
    };

    document.addEventListener('pointermove', onPointerMove);
    document.documentElement.addEventListener('pointerleave', scheduleClose);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener(
        'pointerleave',
        scheduleClose,
      );
      clearCloseTimer();
    };
  }, [isOpen, hoverTrigger, dispatch]);

  function handleMenuSelect(itemName: string) {
    for (const item of items) {
      if (typeof item === 'object' && item.onClick && item.name === itemName) {
        item.onClick();
        break;
      }
    }
    handleOpenChange(false);
  }

  return (
    <>
      {/* THE INVISIBLE ANCHOR:
        A 0x0 pixel real DOM node that follows your right-clicks.
      */}
      <div
        ref={triggerRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: 0,
          height: 0,
          pointerEvents: 'none', // Prevents it from interfering with user clicks
        }}
      />
      <Popover
        ref={popoverRef}
        triggerRef={triggerRef}
        isOpen={isOpen && !!items.length}
        onOpenChange={handleOpenChange}
        placement="bottom start"
        isNonModal
        style={{ width: 200, margin: 1 }}
      >
        <Menu
          onMenuSelect={handleMenuSelect}
          items={items as MenuItem[]}
          style={{ backgroundColor: theme.menuBackground }}
        />
      </Popover>
    </>
  );
}
