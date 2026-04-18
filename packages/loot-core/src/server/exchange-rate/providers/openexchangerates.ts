import { logger } from '../../../platform/server/log';
import { getOpenExchangeRatesAppId } from '../prefs';
import { type ExchangeRateData, type ExchangeRateProvider } from '../types';

// OpenExchangeRates API response interfaces
type OpenExchangeRatesResponse = {
  disclaimer?: string;
  license?: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
};

// OpenExchangeRates error response interface
type OpenExchangeRatesErrorResponse = {
  error: true;
  status: number;
  message: string;
  description: string;
};

// OpenExchangeRates usage/plan response interface
type OpenExchangeRatesUsageResponse = {
  status: number;
  data: {
    app_id: string;
    status: string;
    plan: {
      name: string;
      quota: string;
      update_frequency: string;
      features: {
        base: boolean;
        symbols: boolean;
        experimental: boolean;
        'time-series': boolean;
        convert: boolean;
        'bid-ask': boolean;
        ohlc: boolean;
        spot: boolean;
      };
    };
    usage: {
      requests: number;
      requests_quota: number;
      requests_remaining: number;
      days_elapsed: number;
      days_remaining: number;
      daily_average: number;
    };
  };
};

// OpenExchangeRates provider - requires App ID
// Supports both current and historical rates
export class OpenExchangeRatesProvider implements ExchangeRateProvider {
  name = 'openexchangerates';
  supportsHistory = true;

  private baseUrl = 'https://openexchangerates.org/api';
  private appId?: string;
  private planFeatures?: {
    base: boolean;
  };
  private usageData?: {
    planName: string;
    quota: string;
    requests: number;
    requestsQuota: number;
    requestsRemaining: number;
    daysRemaining: number;
    dailyAverage: number;
  };

  /**
   * @param appId App ID for OpenExchangeRates (required)
   */
  constructor(appId?: string) {
    this.appId = appId;
  }

  /**
   * Fetches the user's plan features and usage data.
   * This does not count against the API quota, so it's called after each API request.
   * Note: All plans (including free) support the 'symbols' parameter.
   * Only paid plans support custom 'base' currency.
   */
  private async fetchPlanFeatures(): Promise<void> {
    if (!this.appId) {
      this.usageData = undefined;
      return;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/usage.json?app_id=${this.appId}`,
      );
      const data = (await response.json()) as
        | OpenExchangeRatesUsageResponse
        | OpenExchangeRatesErrorResponse;

      // Check if it's an error response
      if ('error' in data && data.error) {
        logger.error(
          'Failed to fetch OpenExchangeRates plan features:',
          data.message,
        );
        // Clear cached data on error (invalid App ID)
        this.planFeatures = {
          base: false,
        };
        this.usageData = undefined;
        return;
      }

      const successData = data as OpenExchangeRatesUsageResponse;
      if (successData.status === 200 && successData.data?.plan?.features) {
        this.planFeatures = {
          base: successData.data.plan.features.base,
        };

        // Store usage data for display in UI
        this.usageData = {
          planName: successData.data.plan.name,
          quota: successData.data.plan.quota,
          requests: successData.data.usage.requests,
          requestsQuota: successData.data.usage.requests_quota,
          requestsRemaining: successData.data.usage.requests_remaining,
          daysRemaining: successData.data.usage.days_remaining,
          dailyAverage: successData.data.usage.daily_average,
        };
      } else {
        // Default to free plan features if we can't fetch
        this.planFeatures = {
          base: false,
        };
        this.usageData = undefined;
      }
    } catch (error) {
      logger.error('Failed to fetch OpenExchangeRates plan features:', error);
      // Default to free plan features on error and clear usage data
      this.planFeatures = {
        base: false,
      };
      this.usageData = undefined;
    }
  }

  /**
   * Gets the current usage data for display in UI
   * Fetches fresh data from the API to ensure accuracy
   */
  async getUsageData(): Promise<typeof this.usageData> {
    // Fetch fresh plan features and usage data
    await this.fetchPlanFeatures();
    return this.usageData;
  }

  async fetchRates(
    baseCurrency: string,
    targetCurrencies: string[],
  ): Promise<ExchangeRateData[]> {
    if (!this.appId) {
      return [];
    }

    // Ensure we know the plan features
    await this.fetchPlanFeatures();

    try {
      // Build URL with app_id and conditional parameters based on plan features
      let url = `${this.baseUrl}/latest.json?app_id=${this.appId}`;

      // Only include base parameter if the plan supports it
      if (this.planFeatures?.base && baseCurrency !== 'USD') {
        url += `&base=${baseCurrency}`;
      }

      // All plans support symbols parameter, so include it when we have target currencies
      if (targetCurrencies.length > 0) {
        const symbols = targetCurrencies.join(',');
        url += `&symbols=${symbols}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      // Check for API errors
      if (data.error) {
        const errorData = data as OpenExchangeRatesErrorResponse;
        logger.error(
          `OpenExchangeRates API error: ${errorData.message} - ${errorData.description}`,
        );
        return [];
      }

      const ratesData = data as OpenExchangeRatesResponse;

      // Convert timestamp to date string
      const rateDate = new Date(ratesData.timestamp * 1000)
        .toISOString()
        .split('T')[0];
      const timestampISO = new Date(ratesData.timestamp * 1000).toISOString();

      const results: ExchangeRateData[] = [];

      // If we're on a free plan and requested a non-USD base, we need to convert rates
      const actualBase = ratesData.base;
      const needsConversion = actualBase !== baseCurrency;

      for (const targetCurrency of targetCurrencies) {
        if (targetCurrency === baseCurrency) {
          results.push({
            from_currency: baseCurrency,
            to_currency: targetCurrency,
            rate: 1.0,
            date: rateDate,
            source: this.name,
            timestamp: timestampISO,
          });
        } else if (needsConversion) {
          // Convert from USD base to requested base
          // Formula: rate(base -> target) = rate(USD -> target) / rate(USD -> base)
          const usdToTarget = ratesData.rates[targetCurrency];
          const usdToBase = ratesData.rates[baseCurrency];

          if (usdToTarget && usdToBase) {
            results.push({
              from_currency: baseCurrency,
              to_currency: targetCurrency,
              rate: usdToTarget / usdToBase,
              date: rateDate,
              source: this.name,
              timestamp: timestampISO,
            });
          }
        } else if (ratesData.rates[targetCurrency]) {
          // Direct rate available
          results.push({
            from_currency: baseCurrency,
            to_currency: targetCurrency,
            rate: ratesData.rates[targetCurrency],
            date: rateDate,
            source: this.name,
            timestamp: timestampISO,
          });
        }
      }

      // Refresh usage data after successful API call (doesn't count against quota)
      await this.fetchPlanFeatures();

      return results;
    } catch (error) {
      logger.error('Failed to fetch rates from OpenExchangeRates:', error);
      return [];
    }
  }

  async fetchHistoricalRate(
    from: string,
    to: string,
    date: string,
  ): Promise<number | null> {
    if (!this.appId) {
      logger.warn('Historical rates require an App ID for OpenExchangeRates');
      return null;
    }

    // Ensure we know the plan features
    await this.fetchPlanFeatures();

    try {
      // Build historical URL with conditional parameters
      let url = `${this.baseUrl}/historical/${date}.json?app_id=${this.appId}`;

      // Only include base parameter if the plan supports it
      if (this.planFeatures?.base && from !== 'USD') {
        url += `&base=${from}`;
      }

      // All plans support symbols parameter
      url += `&symbols=${to}`;

      const response = await fetch(url);
      const data = await response.json();

      // Check for API errors
      if (data.error) {
        const errorData = data as OpenExchangeRatesErrorResponse;
        logger.warn(
          `OpenExchangeRates API error for ${date}: ${errorData.message}`,
        );
        return null;
      }

      const ratesData = data as OpenExchangeRatesResponse;

      // If we're on a free plan and requested a non-USD base, we need to convert
      const actualBase = ratesData.base;
      const needsConversion = actualBase !== from;

      if (needsConversion) {
        // Convert from USD base to requested base
        // Formula: rate(from -> to) = rate(USD -> to) / rate(USD -> from)
        const usdToTarget = ratesData.rates[to];
        const usdToFrom = ratesData.rates[from];

        if (usdToTarget && usdToFrom) {
          // Refresh usage data after successful API call (doesn't count against quota)
          await this.fetchPlanFeatures();
          return usdToTarget / usdToFrom;
        }
      } else if (ratesData.rates[to]) {
        // Direct rate available
        // Refresh usage data after successful API call (doesn't count against quota)
        await this.fetchPlanFeatures();
        return ratesData.rates[to];
      }

      logger.warn(`No rate available for ${from} -> ${to} on ${date}`);
      return null;
    } catch (error) {
      logger.error(
        `Failed to fetch historical rate ${from} -> ${to} for ${date}:`,
        error,
      );
      return null;
    }
  }
}

/**
 * Gets the OpenExchangeRates usage data for display in UI
 * Fetches fresh data from the API with the current App ID
 */
export async function getOpenExchangeRatesUsage(): Promise<
  Awaited<ReturnType<OpenExchangeRatesProvider['getUsageData']>>
> {
  // Always fetch fresh App ID from prefs to ensure we're using the latest value
  const currentAppId = await getOpenExchangeRatesAppId();

  // Create a temporary provider instance with the current App ID
  const tempProvider = new OpenExchangeRatesProvider(currentAppId);

  // Fetch and return usage data
  return await tempProvider.getUsageData();
}
