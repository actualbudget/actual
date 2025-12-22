import { act, render, screen, waitFor } from '@testing-library/react';

import { useIsMobileCalculatorKeypadEnabled } from './useIsMobileCalculatorKeypadEnabled';

import { mergeSyncedPrefs } from '@desktop-client/prefs/prefsSlice';
import {
  TestProvider,
  mockStore,
  resetMockStore,
} from '@desktop-client/redux/mock';

type MatchMediaParams = {
  isNarrowViewport: boolean;
  isCoarsePointer: boolean;
  isNoHover: boolean;
};

function mockMatchMedia({
  isNarrowViewport,
  isCoarsePointer,
  isNoHover,
}: MatchMediaParams) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      let matches = false;

      if (query.includes('max-width')) {
        matches = isNarrowViewport;
      } else if (query === '(pointer: coarse)') {
        matches = isCoarsePointer;
      } else if (query === '(hover: none)') {
        matches = isNoHover;
      }

      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        // Safari < 14 support
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: () => true,
      } as MediaQueryList;
    },
  });
}

function Probe() {
  const enabled = useIsMobileCalculatorKeypadEnabled();
  return <div>{enabled ? 'enabled' : 'disabled'}</div>;
}

describe('useIsMobileCalculatorKeypadEnabled', () => {
  beforeEach(() => {
    resetMockStore();
    mockStore.dispatch(mergeSyncedPrefs({ numberFormat: 'comma-dot' }));
  });

  test('is disabled by default even on mobile-like devices', () => {
    mockMatchMedia({
      isNarrowViewport: true,
      isCoarsePointer: true,
      isNoHover: true,
    });

    render(
      <TestProvider>
        <Probe />
      </TestProvider>,
    );

    expect(screen.getByText('disabled')).toBeInTheDocument();
  });

  test('is enabled when opted-in via feature flag and on mobile-like devices', () => {
    mockMatchMedia({
      isNarrowViewport: true,
      isCoarsePointer: true,
      isNoHover: true,
    });

    mockStore.dispatch(
      mergeSyncedPrefs({
        'flags.mobileCalculatorKeypad': 'true',
      }),
    );

    render(
      <TestProvider>
        <Probe />
      </TestProvider>,
    );

    expect(screen.getByText('enabled')).toBeInTheDocument();
  });

  test('remains disabled when opted-in but not on a mobile-like device', () => {
    mockMatchMedia({
      isNarrowViewport: false,
      isCoarsePointer: false,
      isNoHover: false,
    });

    mockStore.dispatch(
      mergeSyncedPrefs({
        'flags.mobileCalculatorKeypad': 'true',
      }),
    );

    render(
      <TestProvider>
        <Probe />
      </TestProvider>,
    );

    expect(screen.getByText('disabled')).toBeInTheDocument();
  });

  test('does not crash when feature flag toggles while mounted', async () => {
    mockMatchMedia({
      isNarrowViewport: true,
      isCoarsePointer: true,
      isNoHover: true,
    });

    render(
      <TestProvider>
        <Probe />
      </TestProvider>,
    );

    // Starts disabled (flag default false)
    expect(screen.getByText('disabled')).toBeInTheDocument();

    // Toggle on
    act(() => {
      mockStore.dispatch(
        mergeSyncedPrefs({
          'flags.mobileCalculatorKeypad': 'true',
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText('enabled')).toBeInTheDocument();
    });

    // Toggle off
    act(() => {
      mockStore.dispatch(
        mergeSyncedPrefs({
          'flags.mobileCalculatorKeypad': 'false',
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText('disabled')).toBeInTheDocument();
    });
  });
});
