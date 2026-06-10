import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';

import type { Falsy } from '@actual-app/core/types/util';

import {
  addItems,
  setContextMenuPosition,
} from '#contextmenu/contextMenuSlice';
import type { ContextMenuItem } from '#contextmenu/types.d';
import { useRefEventListener } from '#hooks/useRefEventListener';
import { useDispatch } from '#redux';

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

  const processedItems = items.filter(
    item => item && (typeof item === 'symbol' || !item.hidden),
  ) as ContextMenuItem[];

  useRefEventListener(triggerRef, 'contextmenu', (e: MouseEvent) => {
    if (enabled) {
      e.preventDefault();
      dispatch(addItems(processedItems));
      dispatch(setContextMenuPosition({ x: e.clientX, y: e.clientY }));
    }
  });

  const handleContextMenu = useCallback(() => {
    if (!triggerRef.current || !enabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // prefer MouseEvent bubbling over dispatching events to
    // allow nesting context menu actions
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
