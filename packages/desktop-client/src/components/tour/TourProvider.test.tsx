import type { ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TourProvider, useTour } from './TourProvider';

function wrapper({ children }: { children: ReactNode }) {
  return <TourProvider>{children}</TourProvider>;
}

describe('TourProvider', () => {
  it('starts and stops the tour', () => {
    const { result } = renderHook(() => useTour(), { wrapper });

    expect(result.current.activeTourId).toBeNull();

    act(() => result.current.startTour());
    expect(result.current.activeTourId).toBe('budget-tour');

    act(() => result.current.stopTour());
    expect(result.current.activeTourId).toBeNull();
  });

  it('does not start the tour on narrow screens', () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 400;
    try {
      const { result } = renderHook(() => useTour(), { wrapper });

      act(() => result.current.startTour());
      expect(result.current.activeTourId).toBeNull();
    } finally {
      window.innerWidth = originalWidth;
    }
  });
});
