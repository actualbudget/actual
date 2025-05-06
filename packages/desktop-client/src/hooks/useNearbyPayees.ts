import { useCallback, useMemo } from 'react';

import { type PayeeEntity } from 'loot-core/types/models';

import { useGeolocation } from './useGeolocation';
import { usePayees } from './usePayees';

type LatLongCoordinates = Pick<
  GeolocationCoordinates,
  'latitude' | 'longitude'
>;

const payeeGeolocations: Array<
  Pick<PayeeEntity, 'id' | 'name'> & {
    geolocation: LatLongCoordinates;
  }
> = [
  {
    // 2 locations for Starline Windows
    id: '263714b9-365d-49ae-9829-3d3fbe8d0216',
    name: 'Starline Windows',
    geolocation: {
      latitude: 49.0677664,
      longitude: -122.6936539,
    },
  },
  {
    id: '263714b9-365d-49ae-9829-3d3fbe8d0216',
    name: 'Starline Windows',
    geolocation: {
      latitude: 49.06827256830727,
      longitude: -122.69461576882055,
    },
  },
  {
    id: 'cf9d7939-95d1-4118-80b1-e1a4eec6ee03',
    name: 'A&W',
    geolocation: {
      latitude: 49.05258819377441,
      longitude: -122.69136086574922,
    },
  },
  {
    id: 'a759f467-74fd-4894-8c87-1bb20a13f6a8',
    name: 'Sun Processing Ltd',
    geolocation: {
      latitude: 49.06719263166092,
      longitude: -122.6943839011504,
    },
  },
  {
    id: '771432ea-7249-4fc7-bead-c2bc7e5e2223',
    name: 'Caddydriver',
    geolocation: {
      latitude: 49.0669089090774,
      longitude: -122.69341856431981,
    },
  },
  {
    id: '751762bc-61b7-4c77-a75a-d311af8399c5',
    name: 'Super Save',
    geolocation: {
      latitude: 49.06774233955684,
      longitude: -122.69761371974859,
    },
  },
  {
    id: 'b6349c65-a5ea-4c81-b4f5-b4181e520bf9',
    name: 'Starline Windows Parking',
    geolocation: {
      latitude: 49.06839669373029,
      longitude: -122.6922249813429,
    },
  },
];

export function useNearbyPayees({ thresholdInMeters = 50 } = {}) {
  const { coordinates: currentCoordinates, error } = useGeolocation();
  const payees = usePayees();

  console.log('Payees:', payees);

  const payeesWithGeocoordinates = useMemo(
    () =>
      payees.reduce(
        (acc, payee) => {
          const payeeCoordinatesList = getPayeeGeocoordinates(payee.id);
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
    [payees],
  );

  const getPayeesWithinThreshold = useCallback(
    (coordinates: LatLongCoordinates, thresholdInMeters: number) =>
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

  const assignPayeesToLocation = useCallback(
    (
      payeeIds: Array<PayeeEntity['id']>,
      coordinates: LatLongCoordinates = currentCoordinates,
    ) => {
      if (!currentCoordinates) {
        console.warn('Location is not available.');
        return;
      }

      const payeesWithinThreshold = new Set(
        getPayeesWithinThreshold(coordinates, thresholdInMeters).map(p => p.id),
      );

      for (const payeeId of payeeIds) {
        // If current coordinates is within the threshold of any
        // existing payee coordinates, skip
        if (payeesWithinThreshold.has(payeeId)) {
          continue;
        }

        payeeGeolocations.push({
          id: payeeId,
          name: null,
          geolocation: {
            latitude: currentCoordinates.latitude,
            longitude: currentCoordinates.longitude,
          },
        });
      }
    },
    [currentCoordinates, getPayeesWithinThreshold, thresholdInMeters],
  );

  return useMemo(
    () => ({
      payees: getPayeesWithinThreshold(currentCoordinates, thresholdInMeters),
      coordinates: currentCoordinates,
      assignPayeesToLocation,
      error,
    }),
    [
      getPayeesWithinThreshold,
      currentCoordinates,
      thresholdInMeters,
      assignPayeesToLocation,
      error,
    ],
  );
}

function getDistance(
  currentLatLong: LatLongCoordinates,
  referenceLatLong: LatLongCoordinates,
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

function getPayeeGeocoordinates(payeeId: PayeeEntity['id']) {
  return payeeGeolocations
    .filter(p => p.id === payeeId)
    .map(p => p.geolocation);
}
