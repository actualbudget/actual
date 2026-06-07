import { useRef } from 'react';

import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import _ from 'lodash';

import {
  closeContextMenu,
  openContextMenu,
} from '#contextmenu/contextMenuSlice';
import { useRefEventListener } from '#hooks/useRefEventListener';
import { useDispatch, useSelector } from '#redux';

export function ContextMenu() {
  const dispatch = useDispatch();
  const { isOpen, position, items } = useSelector(state => state.contextMenu);

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      dispatch(closeContextMenu());
    }
  }

  // Handle right-clicks to OPEN or JUMP the menu
  useRefEventListener(document, 'contextmenu', (e: MouseEvent) => {
    if (items.length) {
      e.preventDefault();
      dispatch(openContextMenu({ position: { x: e.clientX, y: e.clientY } }));
    }
  });

  // 2. Handle left-clicks to DISMISS the menu
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

  function handleMenuSelect(itemName: string) {
    for (const item of items) {
      if (
        typeof item === 'object' &&
        'onClick' in item &&
        item.name === itemName
      ) {
        item.onClick();
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
