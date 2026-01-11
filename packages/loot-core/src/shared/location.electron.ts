import {
  BrowserGeolocationAdapter,
  SendApiLocationClient,
} from './location-adapters';
import { LocationService } from './location-service';

// Export platform-specific instance
// Note: Electron supports the same browser APIs as web environments
export const locationService = new LocationService(
  new BrowserGeolocationAdapter(),
  new SendApiLocationClient(),
);
