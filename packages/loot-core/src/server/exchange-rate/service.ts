import { logger } from '../../platform/server/log';

import {
  getOpenExchangeRatesAppId,
  isExternalExchangeRatesEnabled,
  getExchangeRateProvider,
} from './prefs';
import { OpenExchangeRatesProvider, MempoolSpaceProvider } from './providers';
import { type ExchangeRateProvider, type ExchangeRateData } from './types';

type CachedRate = {
  rate: number;
  timestamp: string;
  source: 'api' | 'manual';
};

class ExchangeRateService {
  private providers: ExchangeRateProvider[] = [];
  private rateCache: Map<string, CachedRate> = new Map();

  async initializeProviders(): Promise<void> {
    try {
      this.providers = [];

      const isEnabled = await isExternalExchangeRatesEnabled();
      if (!isEnabled) {
        logger.log('External exchange rate fetching is disabled');
        return;
      }

      const selectedProvider = await getExchangeRateProvider();

      if (selectedProvider === 'openexchangerates') {
        const openExchangeRatesAppId = await getOpenExchangeRatesAppId();
        if (openExchangeRatesAppId) {
          this.providers.push(
            new OpenExchangeRatesProvider(openExchangeRatesAppId),
          );
          logger.log('Initialized OpenExchangeRates provider');
        } else {
          logger.warn(
            'OpenExchangeRates provider selected but no App ID configured. ' +
              'Please set the openExchangeRatesAppId preference. ' +
              'Sign up for a free account at https://openexchangerates.org/signup',
          );
        }
      } else if (selectedProvider === 'mempoolspace') {
        this.providers.push(new MempoolSpaceProvider());
        logger.log('Initialized Mempool.space provider');
      }
    } catch (error) {
      logger.error('Failed to initialize exchange rate providers:', error);
      // Fallback to just MempoolSpace provider on error
      this.providers = [new MempoolSpaceProvider()];
    }
  }

  async fetchAndCacheRates(
    baseCurrency: string,
    targetCurrencies: string[],
  ): Promise<void> {
    if (this.providers.length === 0) {
      await this.initializeProviders();
    }

    // If still no providers after initialization, external fetching is disabled
    if (this.providers.length === 0) {
      return;
    }

    const fallbackTimestamp = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    for (const provider of this.providers) {
      try {
        const rates = await provider.fetchRates(baseCurrency, targetCurrencies);

        for (const rateData of rates) {
          this.cacheRate({
            ...rateData,
            timestamp: rateData.timestamp || fallbackTimestamp,
            date: today,
          });
        }
      } catch (error) {
        logger.error(`Failed to fetch rates from ${provider.name}:`, error);
      }
    }
  }

  private cacheRate(
    rateData: ExchangeRateData & { timestamp: string; date: string },
  ): void {
    const cacheKey = `${rateData.from_currency}-${rateData.to_currency}-${rateData.date}`;
    this.rateCache.set(cacheKey, {
      rate: rateData.rate,
      timestamp: rateData.timestamp,
      source: (rateData.source === 'manual' ? 'manual' : 'api') as
        | 'api'
        | 'manual',
    });
  }

  async getRate(
    fromCurrency: string,
    toCurrency: string,
    date?: string,
  ): Promise<number | null> {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const isToday = targetDate === today;

    const cacheKey = `${fromCurrency}-${toCurrency}-${targetDate}`;
    const cachedRate = this.rateCache.get(cacheKey);

    // If we have a cached rate for a historical date, use it
    if (cachedRate && !isToday) {
      return cachedRate.rate;
    }

    // If we have a cached rate for today, check if it's fresh enough
    if (cachedRate && isToday) {
      const now = new Date();
      const rateTime = new Date(cachedRate.timestamp);
      const ageLimitMs = await this.getUpdateInterval();

      if (now.getTime() - rateTime.getTime() < ageLimitMs) {
        // Cached rate is fresh enough
        return cachedRate.rate;
      }
    }

    // Either no cached rate exists, or today's rate is too old
    // Only fetch if providers are enabled
    const isEnabled = await isExternalExchangeRatesEnabled();
    if (isEnabled) {
      await this.fetchAndCacheRates(fromCurrency, [toCurrency]);

      const freshRate = this.rateCache.get(cacheKey);
      if (freshRate) {
        return freshRate.rate;
      }
    } else if (cachedRate) {
      // If external fetching is disabled, use cached rate even if old
      return cachedRate.rate;
    }

    // Try reverse rate
    const reverseCacheKey = `${toCurrency}-${fromCurrency}-${targetDate}`;
    const reverseRate = this.rateCache.get(reverseCacheKey);

    if (reverseRate && reverseRate.rate !== 0) {
      return 1 / reverseRate.rate;
    }

    return null;
  }

  async getUsedCurrencies(): Promise<string[]> {
    const currencies = new Set<string>();

    return Array.from(currencies);
  }

  /**
   * Checks if cached rate is fresh enough based on provider settings.
   * Returns the age limit in milliseconds.
   */
  async getUpdateInterval(): Promise<number> {
    const selectedProvider = await getExchangeRateProvider();
    const secondsInMinute = 60;
    const msInSecond = 1000;

    let minutes = 15; // Default for mempool.space

    if (selectedProvider === 'openexchangerates') {
      // OpenExchangeRates free plan: 1000 requests/month
      // Polling hourly = ~720 requests/month (safe margin)
      minutes = 60; // 1 hour
    }

    return minutes * secondsInMinute * msInSecond;
  }

  async addManualRate(
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    date?: string,
  ): Promise<void> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    this.cacheRate({
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate,
      date: targetDate,
      source: 'manual',
      timestamp,
    });
  }

  async getOpenExchangeRatesUsage(): Promise<
    ReturnType<OpenExchangeRatesProvider['getUsageData']>
  > {
    const currentAppId = await getOpenExchangeRatesAppId();
    const tempProvider = new OpenExchangeRatesProvider(currentAppId);
    return await tempProvider.getUsageData();
  }
}

export const exchangeRateService = new ExchangeRateService();
