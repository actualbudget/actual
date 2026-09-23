import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

export type TourId = 'budget-tour';

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

  const startTour = (tourId: TourId = 'budget-tour') => {
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
