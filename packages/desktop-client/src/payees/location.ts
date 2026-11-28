import { geolocationAdapter } from '#payees/location-platform';

import { SendApiLocationClient } from './location-adapters';
import { LocationService } from './location-service';

export const locationService = new LocationService(
  geolocationAdapter,
  new SendApiLocationClient(),
);
