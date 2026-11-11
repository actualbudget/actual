import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { useResponsive } from './useResponsive';

/**
 * How long the pointer has to rest on a trigger before its menu opens. Long
 * enough that sweeping the pointer across the toolbar does not pop menus
 * open, short enough to feel instant when aiming at one.
 */
export const HOVER_MENU_OPEN_DELAY = 150;

/**
 * How long the pointer may be outside of both the trigger and the menu
 * before a hover-opened menu closes again. This is also what lets the
 * pointer travel across the small gap between trigger and menu.
 */
export const HOVER_MENU_CLOSE_DELAY = 300;

/** Extra tolerance (in px) around the trigger/menu when testing the pointer. */
const HOVER_MENU_HIT_PADDING = 8;

type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/**
 * Whether the point is inside the rectangle, allowing for a small tolerance
 * around it so the pointer can cross the gap between a trigger and its menu.
 */
export function isPointInsideRect(
  rect: RectLike | null | undefined,
  x: number,
  y: number,
  padding: number = HOVER_MENU_HIT_PADDING,
): boolean {
  if (!rect) {
    return false;
  }
  return (
    x >= rect.left - padding &&
    x <= rect.right + padding &&
    y >= rect.top - padding &&
    y <= rect.bottom + padding
  );
}

/**
 * Whether the current device is a "desktop" pointing environment where hover
 * is meaningful. Touch screens report `hover: none`, so menus there keep
 * working through taps only.
 */
export function supportsHover(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export type UseHoverMenuOptions = {
  /**
   * Allows the caller to control the open state. When omitted, the hook keeps
   * the state internally.
   */
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Whether hovering opens the menu. Defaults to "desktop only": wide layouts
   * on devices with a fine pointer that supports hovering. Clicking always
   * works, regardless of this flag.
   */
  isHoverEnabled?: boolean;
  openDelay?: number;
  closeDelay?: number;
};

export type HoverMenuTriggerProps = {
  onHoverStart: () => void;
  onHoverEnd: () => void;
  'aria-expanded': boolean;
  'aria-haspopup': 'menu';
};

export type HoverMenuPopoverProps<T extends HTMLElement> = {
  ref: RefObject<HTMLElement | null>;
  triggerRef: RefObject<T | null>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /**
   * Hover menus are non-modal: a modal popover renders an underlay that
   * would swallow the click on the trigger that is meant to pin the menu.
   */
  isNonModal: true;
  /** Clicks on the trigger are handled by `toggle`, not as "outside". */
  shouldCloseOnInteractOutside: (element: Element) => boolean;
};

export type UseHoverMenuResult<T extends HTMLElement> = {
  /** Whether the menu is currently showing. */
  isOpen: boolean;
  /**
   * Whether the menu was explicitly opened (clicked) and therefore stays open
   * when the pointer leaves it.
   */
  isPinned: boolean;
  /** Ref to attach to the trigger element (button). */
  triggerRef: RefObject<T | null>;
  /** Ref to attach to the popover element so pointer tracking can find it. */
  popoverRef: RefObject<HTMLElement | null>;
  /** Props to spread onto the trigger button. */
  triggerProps: HoverMenuTriggerProps;
  /** Props to spread onto the `Popover` that renders the menu. */
  popoverProps: HoverMenuPopoverProps<T>;
  /** Open the menu and keep it open until dismissed. */
  open: () => void;
  /** Close the menu (from a menu selection, escape, click outside...). */
  close: () => void;
  /**
   * Click handler for the trigger: opens a closed menu, pins a hover-opened
   * menu so it persists, and closes an already pinned menu.
   */
  toggle: () => void;
  /** Handler for the popover's `onOpenChange`. */
  onOpenChange: (isOpen: boolean) => void;
};

/**
 * Dropdown menus that open on hover (desktop) while staying fully clickable.
 *
 * Hovering the trigger opens the menu after a short delay; moving the pointer
 * away from both the trigger and the menu closes it again. Clicking the
 * trigger "pins" the menu so it persists until the user picks an item,
 * presses escape or clicks outside - hovering is just the faster way in.
 */
export function useHoverMenu<T extends HTMLElement = HTMLButtonElement>({
  isOpen: controlledIsOpen,
  onOpenChange,
  isHoverEnabled,
  openDelay = HOVER_MENU_OPEN_DELAY,
  closeDelay = HOVER_MENU_CLOSE_DELAY,
}: UseHoverMenuOptions = {}): UseHoverMenuResult<T> {
  const { isNarrowWidth } = useResponsive();
  const hoverEnabled = isHoverEnabled ?? (!isNarrowWidth && supportsHover());

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const [isPinned, setIsPinned] = useState(false);

  const triggerRef = useRef<T | null>(null);
  const popoverRef = useRef<HTMLElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const setOpen = useCallback(
    (nextIsOpen: boolean) => {
      if (controlledIsOpen === undefined) {
        setInternalIsOpen(nextIsOpen);
      }
      onOpenChange?.(nextIsOpen);
    },
    [controlledIsOpen, onOpenChange],
  );

  const close = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setIsPinned(false);
    setOpen(false);
  }, [clearOpenTimer, clearCloseTimer, setOpen]);

  const open = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setIsPinned(true);
    setOpen(true);
  }, [clearOpenTimer, clearCloseTimer, setOpen]);

  const toggle = useCallback(() => {
    if (isOpen && isPinned) {
      close();
    } else {
      open();
    }
  }, [isOpen, isPinned, open, close]);

  const onHoverStart = useCallback(() => {
    if (!hoverEnabled) {
      return;
    }
    clearCloseTimer();
    if (isOpen || openTimer.current) {
      return;
    }
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      setIsPinned(false);
      setOpen(true);
    }, openDelay);
  }, [hoverEnabled, isOpen, openDelay, clearCloseTimer, setOpen]);

  const onHoverEnd = useCallback(() => {
    // Leaving the trigger before the menu opened cancels the pending open;
    // once open, the document-level pointer tracking below takes over.
    clearOpenTimer();
  }, [clearOpenTimer]);

  // While a hover-opened (unpinned) menu is showing, watch where the pointer
  // is. Modal popovers render an underlay above the page, so hover events on
  // the trigger itself stop firing - tracking positions instead keeps the
  // menu open as long as the pointer rests on the trigger or the menu.
  useEffect(() => {
    if (!isOpen || isPinned || !hoverEnabled) {
      return;
    }

    const scheduleClose = () => {
      if (closeTimer.current) {
        return;
      }
      closeTimer.current = setTimeout(() => {
        closeTimer.current = null;
        close();
      }, closeDelay);
    };

    const onPointerMove = (event: PointerEvent) => {
      const isInside =
        isPointInsideRect(
          triggerRef.current?.getBoundingClientRect(),
          event.clientX,
          event.clientY,
        ) ||
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

    const onPointerLeaveDocument = () => scheduleClose();

    document.addEventListener('pointermove', onPointerMove);
    document.documentElement.addEventListener(
      'pointerleave',
      onPointerLeaveDocument,
    );
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener(
        'pointerleave',
        onPointerLeaveDocument,
      );
      clearCloseTimer();
    };
  }, [isOpen, isPinned, hoverEnabled, closeDelay, close, clearCloseTimer]);

  // Non-modal popovers only dismiss themselves when focus moves elsewhere;
  // also close on any click outside the trigger and the menu (e.g. on a
  // non-focusable part of the page).
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        (triggerRef.current?.contains(target) ||
          popoverRef.current?.contains(target))
      ) {
        return;
      }
      close();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isOpen, close]);

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
    };
  }, [clearOpenTimer, clearCloseTimer]);

  const handleOpenChange = useCallback(
    (nextIsOpen: boolean) => {
      if (nextIsOpen) {
        open();
      } else {
        close();
      }
    },
    [open, close],
  );

  const shouldCloseOnInteractOutside = useCallback(
    (element: Element) => !triggerRef.current?.contains(element),
    [],
  );

  return {
    isOpen,
    isPinned,
    triggerRef,
    popoverRef,
    triggerProps: {
      onHoverStart,
      onHoverEnd,
      'aria-expanded': isOpen,
      'aria-haspopup': 'menu',
    },
    popoverProps: {
      ref: popoverRef,
      triggerRef,
      isOpen,
      onOpenChange: handleOpenChange,
      isNonModal: true,
      shouldCloseOnInteractOutside,
    },
    open,
    close,
    toggle,
    onOpenChange: handleOpenChange,
  };
}
