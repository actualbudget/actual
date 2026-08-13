import { lazy, Suspense } from 'react';

import { useTour } from './TourProvider';

const TourHost = lazy(() =>
  import('./TourHost').then(module => ({ default: module.TourHost })),
);

export function Tour() {
  const { activeTourId } = useTour();

  if (activeTourId == null) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <TourHost tourId={activeTourId} />
    </Suspense>
  );
}
