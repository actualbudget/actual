import { useCallback, useMemo } from 'react';

import { type PayeeEntity } from 'loot-core/types/models';

import { useGeolocation } from './useGeolocation';
import { usePayees } from './usePayees';
import { usePayeeGeolocations } from './usePayeeGeolocations';
import { assignPayeeGeolocation } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';

type LatLongCoordinates = Pick<
  GeolocationCoordinates,
  'latitude' | 'longitude'
>;

export function useNearbyPayees({ thresholdInMeters = 50 } = {}) {
  const dispatch = useDispatch();
  const { coordinates: currentCoordinates, error } = useGeolocation();
  const payees = usePayees();
  const payeeGeolocations = usePayeeGeolocations();

  console.log('payeeGeolocations', payeeGeolocations);

  const payeesWithGeocoordinates = useMemo(
    () =>
      payees.reduce(
        (acc, payee) => {
          const payeeCoordinatesList = payeeGeolocations.filter(pg => pg.payee_id === payee.id);
          for (const payeeCoordinates of payeeCoordinatesList) {
            acc.push({
              ...payee,
              coordinates: payeeCoordinates,
            });
          }
          return acc;
        },
        [] as (PayeeEntity & { coordinates: LatLongCoordinates })[],
      ),
    [payees, payeeGeolocations],
  );

  const getPayeesWithinThreshold = useCallback(
    (coordinates: LatLongCoordinates | null, thresholdInMeters: number) =>
      payeesWithGeocoordinates
        .map(payee => ({
          ...payee,
          distance: getDistance(coordinates, payee.coordinates),
        }))
        .filter(payee => payee.distance >= 0)
        .filter(payee => payee.distance <= thresholdInMeters)
        .sort((a, b) => a.distance - b.distance),
    [payeesWithGeocoordinates],
  );

  const payeesWithinThreshold = useMemo(
    () => getPayeesWithinThreshold(currentCoordinates, thresholdInMeters),
    [currentCoordinates, getPayeesWithinThreshold, thresholdInMeters],
  );

  const assignPayeesToGeolocation = useCallback(
    async (
      payeeIds: Array<PayeeEntity['id']>,
      coordinates: LatLongCoordinates | null = currentCoordinates,
    ) => {
      if (!coordinates) {
        console.warn('Location is not available.');
        return;
      }

      const payeesWithinThresholdSet = new Set(
        payeesWithinThreshold.map(p => p.id),
      );

      for (const payeeId of payeeIds) {
        // If current coordinates is within the threshold of any
        // existing payee coordinates, skip
        if (payeesWithinThresholdSet.has(payeeId)) {
          continue;
        }

        dispatch(assignPayeeGeolocation({
          payeeId,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }));
      }
    },
    [currentCoordinates, payeesWithinThreshold],
  );

  return useMemo(
    () => ({
      payees: payeesWithinThreshold,
      coordinates: currentCoordinates,
      assignPayeesToGeolocation,
      error,
    }),
    [payeesWithinThreshold, currentCoordinates, assignPayeesToGeolocation, error],
  );
}

function getDistance(
  currentLatLong: LatLongCoordinates | null,
  referenceLatLong: LatLongCoordinates | null,
) {
  if (!currentLatLong || !referenceLatLong) {
    return -1;
  }

  const R = 6371000; // Earth's radius in meters
  const deltaLat =
    ((currentLatLong.latitude - referenceLatLong.latitude) * Math.PI) / 180;
  const deltaLong =
    ((currentLatLong.longitude - referenceLatLong.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos((referenceLatLong.latitude * Math.PI) / 180) *
      Math.cos((currentLatLong.latitude * Math.PI) / 180) *
      Math.sin(deltaLong / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
