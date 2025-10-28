import { logger } from '../../platform/server/log';

import { exchangeRateService } from './service';

export { exchangeRateService };
export {
  type ExchangeRateProvider,
  type ExchangeRateData,
  type ExchangeRateEntity,
} from './types';

/**
 * Initialize exchange rate service providers.
 * This should be called during app initialization after the database is ready.
 * Periodic rate updates will start automatically when exchange rates are first requested.
 * If initialization fails (e.g., database not ready yet), providers will be initialized
 * on first use.
 */
export async function initializeExchangeRateServices(): Promise<void> {
  try {
    await exchangeRateService.initializeProviders();
    logger.log('Exchange rate providers initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize exchange rate providers:', error);
    // Don't throw - providers will be initialized on first use
  }
}
