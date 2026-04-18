import { logger } from '../../../platform/server/log';
import { getMempoolSpaceBaseUrl } from '../prefs';
import { type ExchangeRateData, type ExchangeRateProvider } from '../types';

// Mempool.space API for multiple currency rates (free, no auth required)
// Provides current rates for major fiat currencies relative to Bitcoin, which allows cross-currency calculations
// Also supports historical rates for supported currencies using exchangeRates data
export class MempoolSpaceProvider implements ExchangeRateProvider {
  name = 'mempool.space';
  supportsHistory = true;

  async fetchRates(
    baseCurrency: string,
    targetCurrencies: string[],
  ): Promise<ExchangeRateData[]> {
    try {
      const baseUrl = await getMempoolSpaceBaseUrl();
      const response = await fetch(`${baseUrl}/prices`);
      const data = await response.json();

      // Convert currencies to uppercase
      baseCurrency = baseCurrency.toUpperCase();
      targetCurrencies = targetCurrencies.map(curr => curr.toUpperCase());

      // Extract timestamp and convert to date string
      const timestamp = data.time ? data.time * 1000 : Date.now(); // Convert seconds to milliseconds
      const timestampISO = new Date(timestamp).toISOString();
      const rateDate = timestampISO.split('T')[0];

      const results: ExchangeRateData[] = [];

      // Check if base currency is available in the data
      const baseRate = data[baseCurrency];

      for (const targetCurrency of targetCurrencies) {
        if (targetCurrency === baseCurrency) {
          continue; // Skip same currency - handled elsewhere
        }

        const targetRate = data[targetCurrency];

        if (baseRate && targetRate) {
          // Both currencies are available - calculate cross rate
          // All rates in data are relative to BTC, so we need to calculate the ratio
          const crossRate = targetRate / baseRate;
          results.push({
            from_currency: baseCurrency,
            to_currency: targetCurrency,
            rate: crossRate,
            date: rateDate,
            source: this.name,
            timestamp: timestampISO,
          });
        } else if (baseCurrency === 'BTC' && targetRate) {
          // BTC as base currency - direct conversion
          results.push({
            from_currency: baseCurrency,
            to_currency: targetCurrency,
            rate: targetRate,
            date: rateDate,
            source: this.name,
            timestamp: timestampISO,
          });
        } else if (targetCurrency === 'BTC' && baseRate) {
          // BTC as target currency - inverse conversion
          results.push({
            from_currency: baseCurrency,
            to_currency: targetCurrency,
            rate: 1 / baseRate,
            date: rateDate,
            source: this.name,
            timestamp: timestampISO,
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to fetch rates from mempool.space:', error);
      return [];
    }
  }

  async fetchHistoricalRate(
    from: string,
    to: string,
    date: string,
  ): Promise<number | null> {
    try {
      // Convert currencies to uppercase
      from = from.toUpperCase();
      to = to.toUpperCase();

      const targetDate = new Date(date);
      // Set to noon on the given date
      targetDate.setHours(12, 0, 0, 0);
      const timestamp = Math.floor(targetDate.getTime() / 1000);

      // Try to fetch the specific currency first to get direct Bitcoin conversion
      let primaryCurrency = 'USD';
      if (from !== 'USD' && from !== 'BTC') {
        primaryCurrency = from;
      } else if (to !== 'USD' && to !== 'BTC') {
        primaryCurrency = to;
      }

      const baseUrl = await getMempoolSpaceBaseUrl();
      const response = await fetch(
        `${baseUrl}/historical-price?currency=${primaryCurrency}&timestamp=${timestamp}`,
      );
      const data = await response.json();

      if (!data.prices || data.prices.length === 0) {
        return null;
      }

      // Extract price data
      const priceData = data.prices[0];
      const exchangeRates = data.exchangeRates || {};

      // Get Bitcoin price in USD from the prices array
      const btcPriceUSD = priceData.USD;

      // Handle direct Bitcoin conversions from prices array
      if (from === 'BTC' && priceData[to]) {
        return priceData[to];
      }
      if (to === 'BTC' && priceData[from]) {
        return 1 / priceData[from];
      }

      // Handle USD conversions
      if (from === 'BTC' && to === 'USD') {
        return btcPriceUSD;
      }
      if (from === 'USD' && to === 'BTC') {
        return 1 / btcPriceUSD;
      }

      // Handle conversions using exchange rates
      if (from === 'BTC' && to !== 'USD') {
        const usdToTargetKey = `USD${to}`;
        return exchangeRates[usdToTargetKey]
          ? btcPriceUSD * exchangeRates[usdToTargetKey]
          : null;
      }
      if (from !== 'BTC' && to === 'BTC') {
        const usdToFromKey = `USD${from}`;
        return exchangeRates[usdToFromKey]
          ? 1 / (btcPriceUSD * exchangeRates[usdToFromKey])
          : null;
      }

      // Handle cross-currency conversions (neither is BTC)
      if (from === 'USD') {
        const usdToTargetKey = `USD${to}`;
        return exchangeRates[usdToTargetKey] || null;
      }
      if (to === 'USD') {
        const usdToFromKey = `USD${from}`;
        return exchangeRates[usdToFromKey]
          ? 1 / exchangeRates[usdToFromKey]
          : null;
      }

      // Cross-currency conversion (neither is USD or BTC)
      const usdToFromKey = `USD${from}`;
      const usdToTargetKey = `USD${to}`;

      if (exchangeRates[usdToFromKey] && exchangeRates[usdToTargetKey]) {
        // Convert: from -> USD -> to
        return exchangeRates[usdToTargetKey] / exchangeRates[usdToFromKey];
      }

      return null;
    } catch (error) {
      logger.error(
        `Failed to fetch historical rate ${from} -> ${to} for ${date} from mempool.space:`,
        error,
      );
      return null;
    }
  }
}
