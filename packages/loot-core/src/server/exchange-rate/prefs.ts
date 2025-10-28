import { type SyncedPrefs } from '../../types/prefs';
import * as db from '../db';

/**
 * Gets a single synced preference value from the database.
 * Returns undefined if the database is not initialized or the preference doesn't exist.
 */
async function getPref<K extends keyof SyncedPrefs>(
  id: K,
): Promise<SyncedPrefs[K] | undefined> {
  if (!db.getDatabase()) {
    return undefined;
  }

  const row = await db.first<{ value: string }>(
    'SELECT value FROM preferences WHERE id = ?',
    [id],
  );
  return row?.value as SyncedPrefs[K] | undefined;
}

/**
 * Checks if external exchange rate fetching is enabled.
 * Returns false by default (disabled).
 */
export async function isExternalExchangeRatesEnabled(): Promise<boolean> {
  const value = await getPref('enableExternalExchangeRates');
  return value === 'true';
}

/**
 * Gets the selected exchange rate provider.
 * Returns 'openexchangerates' or 'mempoolspace'.
 * Defaults to 'mempoolspace' if not set (no authentication required).
 */
export async function getExchangeRateProvider(): Promise<
  'openexchangerates' | 'mempoolspace'
> {
  const value = await getPref('exchangeRateProvider');
  return (value as 'openexchangerates' | 'mempoolspace') || 'mempoolspace';
}

/**
 * Gets the OpenExchangeRates App ID if configured.
 * Returns undefined if no App ID is set.
 */
export async function getOpenExchangeRatesAppId(): Promise<string | undefined> {
  return getPref('openExchangeRatesAppId');
}

/**
 * Gets the MempoolSpace base URL if configured.
 * Returns the default URL if no custom URL is set.
 * Appends /api/v1 to the base URL for API calls.
 */
export async function getMempoolSpaceBaseUrl(): Promise<string> {
  const baseUrl =
    (await getPref('mempoolSpaceBaseUrl')) || 'https://mempool.space';
  return `${baseUrl}/api/v1`;
}
