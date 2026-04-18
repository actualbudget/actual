import { logger } from '../../platform/server/log';
import * as db from '../db';

import {
  getExchangeRateProvider,
  getOpenExchangeRatesAppId,
  isExternalExchangeRatesEnabled,
} from './prefs';
import { MempoolSpaceProvider, OpenExchangeRatesProvider } from './providers';
import { type ExchangeRateData, type ExchangeRateProvider } from './types';

type CachedRate = {
  rate: number;
  timestamp: string;
  source: 'api' | 'manual';
};

class ExchangeRateService {
  private providers: ExchangeRateProvider[] = [];
  private rateCache: Map<string, CachedRate> = new Map();
  // Track in-flight requests to prevent duplicate API calls
  private pendingRequests: Map<string, Promise<void>> = new Map();
  // Track provider initialization to prevent duplicate initialization
  private initializationPromise: Promise<void> | null = null;
  private providersInitialized = false;

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

      this.providersInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize exchange rate providers:', error);
      // Fallback to just MempoolSpace provider on error
      this.providers = [new MempoolSpaceProvider()];
      this.providersInitialized = true;
    }
  }

  /**
   * Ensure providers are initialized, deduplicating concurrent initialization calls.
   */
  private async ensureProvidersInitialized(): Promise<void> {
    // Already initialized
    if (this.providersInitialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    // Start initialization and store the promise
    this.initializationPromise = this.initializeProviders();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  async fetchAndCacheRates(
    baseCurrency: string,
    targetCurrencies: string[],
  ): Promise<void> {
    // Create a unique key for this request to deduplicate
    const requestKey = `${baseCurrency}-${targetCurrencies.sort().join(',')}`;

    // If there's already a pending request for this currency pair, wait for it
    const existingRequest = this.pendingRequests.get(requestKey);
    if (existingRequest) {
      await existingRequest;
      return;
    }

    // Create and store the promise for this request
    const fetchPromise = this.doFetchAndCacheRates(
      baseCurrency,
      targetCurrencies,
    );
    this.pendingRequests.set(requestKey, fetchPromise);

    try {
      await fetchPromise;
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(requestKey);
    }
  }

  private async doFetchAndCacheRates(
    baseCurrency: string,
    targetCurrencies: string[],
  ): Promise<void> {
    await this.ensureProvidersInitialized();

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

  /**
   * Fetch a historical rate using providers that support historical lookups.
   * Uses request deduplication to prevent multiple API calls for the same rate.
   */
  private async fetchHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    date: string,
  ): Promise<number | null> {
    // Create a unique key for deduplication
    const requestKey = `historical-${fromCurrency}-${toCurrency}-${date}`;

    // Check if we already have a pending request for this rate
    const existingRequest = this.pendingRequests.get(requestKey);
    if (existingRequest) {
      await existingRequest;
      // After waiting, check cache
      const cacheKey = `${fromCurrency}-${toCurrency}-${date}`;
      const cachedRate = this.rateCache.get(cacheKey);
      return cachedRate?.rate ?? null;
    }

    // Create the fetch promise
    const fetchPromise = this.doFetchHistoricalRate(
      fromCurrency,
      toCurrency,
      date,
    );
    // Store the promise to track pending requests (converting to void)
    this.pendingRequests.set(
      requestKey,
      fetchPromise.then(() => undefined),
    );

    try {
      return await fetchPromise;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  }

  private async doFetchHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    date: string,
  ): Promise<number | null> {
    await this.ensureProvidersInitialized();

    for (const provider of this.providers) {
      if (provider.supportsHistory && provider.fetchHistoricalRate) {
        try {
          const rate = await provider.fetchHistoricalRate(
            fromCurrency,
            toCurrency,
            date,
          );
          if (rate !== null) {
            // Cache the rate so waiting requests can find it
            const cacheKey = `${fromCurrency}-${toCurrency}-${date}`;
            this.rateCache.set(cacheKey, {
              rate,
              timestamp: new Date().toISOString(),
              source: 'api',
            });
            return rate;
          }
        } catch (error) {
          logger.error(
            `Failed to fetch historical rate from ${provider.name}:`,
            error,
          );
        }
      }
    }

    return null;
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
      // For historical dates, use fetchHistoricalRate if available
      if (!isToday) {
        const historicalRate = await this.fetchHistoricalRate(
          fromCurrency,
          toCurrency,
          targetDate,
        );
        if (historicalRate !== null) {
          // Cache the historical rate
          this.rateCache.set(cacheKey, {
            rate: historicalRate,
            timestamp: new Date().toISOString(),
            source: 'api',
          });
          return historicalRate;
        }
      }

      // Fetch current rates
      await this.fetchAndCacheRates(fromCurrency, [toCurrency]);

      const freshRate = this.rateCache.get(cacheKey);
      if (freshRate) {
        return freshRate.rate;
      }

      // For historical dates, use today's rate as a fallback if historical fetch failed
      if (!isToday) {
        const todayCacheKey = `${fromCurrency}-${toCurrency}-${today}`;
        const todayRate = this.rateCache.get(todayCacheKey);
        if (todayRate) {
          // Cache this rate for the historical date too to prevent repeated lookups
          this.rateCache.set(cacheKey, todayRate);
          return todayRate.rate;
        }
      }
    } else if (cachedRate) {
      // If external fetching is disabled, use cached rate even if old
      return cachedRate.rate;
    }

    // Try reverse rate for the requested date
    const reverseCacheKey = `${toCurrency}-${fromCurrency}-${targetDate}`;
    const reverseRate = this.rateCache.get(reverseCacheKey);

    if (reverseRate && reverseRate.rate !== 0) {
      return 1 / reverseRate.rate;
    }

    // Try reverse rate for today as fallback
    if (!isToday) {
      const todayReverseCacheKey = `${toCurrency}-${fromCurrency}-${today}`;
      const todayReverseRate = this.rateCache.get(todayReverseCacheKey);
      if (todayReverseRate && todayReverseRate.rate !== 0) {
        return 1 / todayReverseRate.rate;
      }
    }

    return null;
  }

  async getUsedCurrencies(): Promise<string[]> {
    const defaultCurrency = await db.first<{ value: string }>(
      'SELECT value FROM preferences WHERE id = ?',
      ['defaultCurrencyCode'],
    );

    // If no default currency is set, return empty array (multi-currency not enabled)
    if (!defaultCurrency?.value) {
      return [];
    }

    const defaultCurrencyCode = defaultCurrency.value;

    const accountCurrencies = await db.runQuery<{ currency_code: string }>(
      `SELECT DISTINCT COALESCE(currency_code, ?) as currency_code FROM accounts WHERE tombstone = 0`,
      [defaultCurrencyCode],
      true,
    );

    const currencies = new Set<string>(
      accountCurrencies.map(row => row.currency_code),
    );

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
