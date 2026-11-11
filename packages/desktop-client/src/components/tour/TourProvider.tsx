import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

/**
 * The guided tour is split into short chapters so a new user can learn one
 * thing at a time, try it, and come back for the next chapter later (from
 * the "Getting started" checklist or the Help menu).
 */
export const TOUR_IDS = [
  'welcome-tour',
  'accounts-tour',
  'budget-tour',
  'schedules-tour',
  'reports-tour',
] as const;

export type TourId = (typeof TOUR_IDS)[number];

export const DEFAULT_TOUR_ID: TourId = 'welcome-tour';

export const TOUR_OFFER_NOTIFICATION_ID = 'tour-offer';

type TourContextValue = {
  activeTourId: TourId | null;
  startTour: (tourId?: TourId) => void;
  stopTour: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

type TourProviderProps = {
  children: ReactNode;
};

export function TourProvider({ children }: TourProviderProps) {
  const { isNarrowWidth } = useResponsive();
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);

  const startTour = (tourId: TourId = DEFAULT_TOUR_ID) => {
    if (isNarrowWidth) {
      return;
    }
    setActiveTourId(tourId);
  };

  const stopTour = () => {
    setActiveTourId(null);
  };

  return (
    <TourContext.Provider value={{ activeTourId, startTour, stopTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
