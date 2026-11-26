import { Capacitor } from '@capacitor/core';

import {
  BrowserGeolocationAdapter,
  CapacitorGeolocationAdapter,
  SendApiLocationClient,
} from './location-adapters';
import { LocationService } from './location-service';

export const locationService = new LocationService(
  Capacitor.isNativePlatform()
    ? new CapacitorGeolocationAdapter()
    : new BrowserGeolocationAdapter(),
  new SendApiLocationClient(),
);
