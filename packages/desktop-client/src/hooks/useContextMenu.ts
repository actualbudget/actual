import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';

import {
  HOVER_MENU_OPEN_DELAY,
  supportsHover,
} from '@actual-app/components/hooks/useHoverMenu';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import type { Falsy } from '@actual-app/core/types/util';

import {
  addItems,
  setContextMenuHoverTrigger,
  setContextMenuPosition,
} from '#contextmenu/contextMenuSlice';
import type { ContextMenuItem } from '#contextmenu/types';
import { useRefEventListener } from '#hooks/useRefEventListener';
import { useDispatch, useSelector } from '#redux';

type UseContextMenuProps = {
  triggerRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  items: Falsy<ContextMenuItem>[];
  /**
   * The control (usually a small "..." button) that opens the menu. When
   * given, `handleContextMenu` anchors the menu under this element instead of
   * the trigger, and `hoverProps` keeps the menu open while the pointer rests
   * on it.
   */
  anchorRef?: RefObject<HTMLElement | null>;
  /**
   * Whether hovering the anchor/trigger button opens the menu. Defaults to
   * desktop devices with a fine, hover-capable pointer.
   */
  isHoverEnabled?: boolean;
};

export type ContextMenuHoverProps = {
  onHoverStart: () => void;
  onHoverEnd: () => void;
};

export function useContextMenu({
  triggerRef,
  enabled = true,
  items,
  anchorRef,
  isHoverEnabled,
}: UseContextMenuProps) {
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const isContextMenuOpen = useSelector(state => state.contextMenu.isOpen);
  const hoverEnabled =
    enabled && (isHoverEnabled ?? (!isNarrowWidth && supportsHover()));

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  useEffect(() => clearHoverTimer, [clearHoverTimer]);

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

  const openMenu = useCallback(
    (openedByHover: boolean) => {
      // An explicit open supersedes any pending hover open.
      clearHoverTimer();
      if (!triggerRef.current || !enabled) return;
      const anchor = anchorRef?.current ?? triggerRef.current;
      const rect = anchor.getBoundingClientRect();

      dispatch(
        setContextMenuHoverTrigger(
          openedByHover
            ? {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
              }
            : null,
        ),
      );

      // prefer MouseEvent bubbling over dispatching events to
      // allow nesting context menu actions
      triggerRef.current.dispatchEvent(
        new MouseEvent('contextmenu', {
          clientX: rect.x,
          clientY: rect.y + rect.height,
          bubbles: true,
        }),
      );
    },
    [triggerRef, anchorRef, enabled, dispatch, clearHoverTimer],
  );

  const handleContextMenu = useCallback(() => openMenu(false), [openMenu]);

  const onHoverStart = useCallback(() => {
    // Never hover-open on top of a menu that is already showing (it may have
    // been pinned by a click).
    if (!hoverEnabled || isContextMenuOpen) return;
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => {
      hoverTimer.current = null;
      openMenu(true);
    }, HOVER_MENU_OPEN_DELAY);
  }, [hoverEnabled, isContextMenuOpen, clearHoverTimer, openMenu]);

  const onHoverEnd = useCallback(() => {
    clearHoverTimer();
  }, [clearHoverTimer]);

  const hoverProps: ContextMenuHoverProps = { onHoverStart, onHoverEnd };

  return { handleContextMenu, hoverProps };
}
