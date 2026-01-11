import {
  BrowserGeolocationAdapter,
  SendApiLocationClient,
} from './location-adapters';
import { LocationService } from './location-service';

// Export platform-specific instance
export const locationService = new LocationService(
  new BrowserGeolocationAdapter(),
  new SendApiLocationClient(),
);
