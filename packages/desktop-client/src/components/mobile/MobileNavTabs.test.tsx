import { MemoryRouter } from 'react-router';

import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestAppStore, TestProviders } from '#mocks';

import { MOBILE_NAV_HEIGHT, MobileNavTabs } from './MobileNavTabs';

let mockIsNarrowWidth = true;
let scrollCallback:
  | ((args: {
      isScrolling: (dir: 'up' | 'down') => boolean;
      hasScrolledToEnd: (dir: 'up' | 'down') => boolean;
    }) => void)
  | undefined;

vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: mockIsNarrowWidth }),
}));

vi.mock('@use-gesture/react', () => ({
  useDrag: vi.fn().mockReturnValue(() => ({})),
}));

vi.mock('#hooks/useScrollListener', () => ({
  useScrollListener: (
    cb: (args: {
      isScrolling: (dir: 'up' | 'down') => boolean;
      hasScrolledToEnd: (dir: 'up' | 'down') => boolean;
    }) => void,
  ) => {
    scrollCallback = cb;
  },
}));

describe('MobileNavTabs', () => {
  beforeEach(() => {
    mockIsNarrowWidth = true;
    scrollCallback = undefined;
  });

  it('sets notification bottom inset above the navbar on narrow screens and clears on unmount', () => {
    const store = createTestAppStore();

    const { unmount } = render(
      <TestProviders store={store}>
        <MemoryRouter initialEntries={['/budget']}>
          <MobileNavTabs />
        </MemoryRouter>
      </TestProviders>,
    );

    expect(store.getState().notifications.inset?.bottom).toBeGreaterThan(
      MOBILE_NAV_HEIGHT,
    );

    unmount();

    expect(store.getState().notifications.inset).toEqual({});
  });

  it('does not set notification inset on wide screens', () => {
    mockIsNarrowWidth = false;
    const store = createTestAppStore();

    render(
      <TestProviders store={store}>
        <MemoryRouter initialEntries={['/budget']}>
          <MobileNavTabs />
        </MemoryRouter>
      </TestProviders>,
    );

    expect(store.getState().notifications.inset).toEqual({});
  });

  it('adjusts notification bottom inset when navbar hides and reappears on scroll', () => {
    const store = createTestAppStore();

    render(
      <TestProviders store={store}>
        <MemoryRouter initialEntries={['/budget']}>
          <MobileNavTabs />
        </MemoryRouter>
      </TestProviders>,
    );

    const defaultBottom = store.getState().notifications.inset?.bottom;
    expect(defaultBottom).toBeGreaterThan(MOBILE_NAV_HEIGHT);

    act(() => {
      scrollCallback?.({
        isScrolling: dir => dir === 'down',
        hasScrolledToEnd: () => false,
      });
    });

    const hiddenBottom = store.getState().notifications.inset?.bottom;
    expect(hiddenBottom).toBeDefined();
    expect(hiddenBottom).toBeLessThan(defaultBottom!);

    act(() => {
      scrollCallback?.({
        isScrolling: dir => dir === 'up',
        hasScrolledToEnd: () => false,
      });
    });

    expect(store.getState().notifications.inset?.bottom).toBe(defaultBottom);
  });
});
