import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';

import type { Falsy } from '@actual-app/core/types/util';

import { addItems } from '#contextmenu/contextMenuSlice';
import type { ContextMenuItem } from '#contextmenu/types.d';
import { useRefEventListener } from '#hooks/useRefEventListener';
import { useDispatch, useSelector } from '#redux';

type UseContextMenuProps = {
  triggerRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  items: Falsy<ContextMenuItem>[];
};

export function useContextMenu({
  triggerRef,
  enabled = true,
  items,
}: UseContextMenuProps) {
  const dispatch = useDispatch();

  // Store actions in a ref to avoid re-binding the event listener on every render
  const actionsRef = useRef(items);
  actionsRef.current = items;

  useRefEventListener(triggerRef, 'contextmenu', () => {
    if (enabled) {
      dispatch(addItems(actionsRef.current));
    }
  });

  const handleContextMenu = useCallback(() => {
    if (!triggerRef.current || !enabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    triggerRef.current.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: rect.x,
        clientY: rect.y + rect.height,
        bubbles: true,
      }),
    );
  }, [triggerRef, enabled]);

  return { handleContextMenu };
}

export function useContextMenuState() {
  const isOpen = useSelector(state => state.contextMenu.isOpen);
  return { isOpen };
}
