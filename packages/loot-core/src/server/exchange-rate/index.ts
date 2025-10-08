import { logger } from '../../platform/server/log';
import { getPrefs } from '../prefs';

import { exchangeRateService } from './service';

export { exchangeRateService };
export {
  type ExchangeRateProvider,
  type ExchangeRateData,
  type ExchangeRateEntity,
} from './types';

/**
 * Initialize exchange rate service providers and start periodic updates.
 * This should be called during app initialization after the database is ready.
 * Periodic rate updates will start immediately to ensure rates are available
 * for currency conversion operations.
 * If the database is not ready yet, this function will wait and retry.
 */
export async function initializeExchangeRateServices(): Promise<void> {
  try {
    // Wait for a budget file to be open before initializing
    // Check periodically until the database is ready
    let retryCount = 0;
    const maxRetries = 60; // Wait up to 60 seconds (60 * 1 second)

    while (!(getPrefs() || {}).id && retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      retryCount++;
    }

    if (!(getPrefs() || {}).id) {
      logger.warn(
        'Exchange rate initialization timed out: no budget file opened within 60 seconds',
      );
      return;
    }

    await exchangeRateService.initializeProviders();
    logger.log('Exchange rate providers initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize exchange rate providers:', error);
    // Don't throw - providers will be initialized on first use
  }
}
