import { useSyncExternalStore } from 'react';

import { breakpoints } from '#tokens';

type WindowSize = { width: number; height: number };

const RESIZE_DEBOUNCE_MS = 250;

// One window-size store shared by every useResponsive caller. Hundreds of
// components call this hook (every amount in the transaction table does,
// through PrivacyFilter), so per-instance state and listeners are costly: each
// instance used to set state shortly after mounting, which flooded React with
// updates while a virtualized list was scrolled and contributed to "Maximum
// update depth exceeded" crashes (#9170).
let windowSize: WindowSize = readWindowSize();
const listeners = new Set<() => void>();
let resizeTimer: ReturnType<typeof setTimeout> | null = null;

function readWindowSize(): WindowSize {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
}

// Only replace the snapshot when the size actually changed, so subscribers
// don't re-render for a resize that ends where it started.
function refreshWindowSize() {
  const next = readWindowSize();
  if (next.width === windowSize.width && next.height === windowSize.height) {
    return false;
  }
  windowSize = next;
  return true;
}

function onResize() {
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = setTimeout(() => {
    resizeTimer = null;
    if (refreshWindowSize()) {
      listeners.forEach(listener => listener());
    }
  }, RESIZE_DEBOUNCE_MS);
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    // The window may have been resized while nothing was listening.
    refreshWindowSize();
    window.addEventListener('resize', onResize);
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('resize', onResize);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
        resizeTimer = null;
      }
    }
  };
}

function getSnapshot() {
  // Nothing keeps the snapshot current while no component is subscribed.
  if (listeners.size === 0) {
    refreshWindowSize();
  }
  return windowSize;
}

function getServerSnapshot() {
  return windowSize;
}

export function useResponsive() {
  const { height, width } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Possible view modes: narrow, small, medium, wide
  // To check if we're at least small width, check !isNarrowWidth
  return {
    // atLeastMediumWidth is provided to avoid checking (isMediumWidth || isWideWidth)
    atLeastMediumWidth: width >= breakpoints.medium,
    isNarrowWidth: width < breakpoints.small,
    isSmallWidth: width >= breakpoints.small && width < breakpoints.medium,
    isMediumWidth: width >= breakpoints.medium && width < breakpoints.wide,
    // No atLeastWideWidth because that's identical to isWideWidth
    isWideWidth: width >= breakpoints.wide,
    height,
    width,
  };
}
