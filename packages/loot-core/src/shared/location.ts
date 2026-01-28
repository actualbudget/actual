import {
  BrowserGeolocationAdapter,
  SendApiLocationClient,
} from './location-adapters';
import { LocationService } from './location-service';

export const locationService = new LocationService(
  new BrowserGeolocationAdapter(),
  new SendApiLocationClient(),
);
