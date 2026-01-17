export type CountryOption = {
  id: string;
  name: string;
};

/**
 * Mapping of IANA timezone identifiers to ISO 3166-1 alpha-2 country codes
 * for European countries supported by GoCardless.
 *
 * Note: We use a manual mapping instead of a library (e.g., countries-and-timezones)
 * because GoCardless only supports 30 European countries. A manual mapping is ~2KB
 * vs 316KB+ for worldwide timezone libraries. This keeps the bundle size small and
 * makes the mapping explicit, type-safe, and easy to audit.
 */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // Austria
  'Europe/Vienna': 'AT',
  // Belgium
  'Europe/Brussels': 'BE',
  // Bulgaria
  'Europe/Sofia': 'BG',
  // Croatia
  'Europe/Zagreb': 'HR',
  // Cyprus
  'Asia/Nicosia': 'CY',
  'Europe/Nicosia': 'CY',
  // Czechia
  'Europe/Prague': 'CZ',
  // Denmark
  'Europe/Copenhagen': 'DK',
  // Estonia
  'Europe/Tallinn': 'EE',
  // Finland
  'Europe/Helsinki': 'FI',
  'Europe/Mariehamn': 'FI',
  // France
  'Europe/Paris': 'FR',
  // Germany
  'Europe/Berlin': 'DE',
  'Europe/Busingen': 'DE',
  // Greece
  'Europe/Athens': 'GR',
  // Hungary
  'Europe/Budapest': 'HU',
  // Iceland
  'Atlantic/Reykjavik': 'IS',
  // Ireland
  'Europe/Dublin': 'IE',
  // Italy
  'Europe/Rome': 'IT',
  // Latvia
  'Europe/Riga': 'LV',
  // Liechtenstein
  'Europe/Vaduz': 'LI',
  // Lithuania
  'Europe/Vilnius': 'LT',
  // Luxembourg
  'Europe/Luxembourg': 'LU',
  // Malta
  'Europe/Malta': 'MT',
  // Netherlands
  'Europe/Amsterdam': 'NL',
  // Norway
  'Europe/Oslo': 'NO',
  // Poland
  'Europe/Warsaw': 'PL',
  // Portugal
  'Europe/Lisbon': 'PT',
  'Atlantic/Madeira': 'PT',
  'Atlantic/Azores': 'PT',
  // Romania
  'Europe/Bucharest': 'RO',
  // Slovakia
  'Europe/Bratislava': 'SK',
  // Slovenia
  'Europe/Ljubljana': 'SI',
  // Spain
  'Europe/Madrid': 'ES',
  'Africa/Ceuta': 'ES',
  'Atlantic/Canary': 'ES',
  // Sweden
  'Europe/Stockholm': 'SE',
  // United Kingdom
  'Europe/London': 'GB',
};

/**
 * Detects a country code based on browser timezone and locale, prioritizing
 * timezone as it's a better indicator of physical location.
 *
 * @param timezone - Browser timezone (e.g., "Europe/Berlin")
 * @param locale - Browser locale string (e.g., "en-GB", "de-DE")
 * @param supportedCountries - Array of country options with id (ISO 3166-1 alpha-2 codes)
 * @returns The country code if found and supported, undefined otherwise
 *
 * @example
 * getCountryFromBrowser("Europe/Berlin", "en", countries) // Returns "DE" (timezone wins)
 * getCountryFromBrowser("America/New_York", "en-GB", countries) // Returns "GB" (locale fallback)
 * getCountryFromBrowser("America/New_York", "en-US", countries) // Returns undefined (neither match)
 */
export function getCountryFromBrowser(
  timezone: string,
  locale: string,
  supportedCountries: CountryOption[],
): string | undefined {
  // Try timezone first - it's the most accurate indicator of physical location
  if (timezone) {
    const countryFromTimezone = TIMEZONE_TO_COUNTRY[timezone];
    if (
      countryFromTimezone &&
      supportedCountries.some(country => country.id === countryFromTimezone)
    ) {
      return countryFromTimezone;
    }
  }

  // Fall back to locale detection (language setting)
  // Parse from the end to handle BCP 47 locales with script subtags (e.g., en-Latn-GB)
  if (locale) {
    const parts = locale.split(/[-_]/);
    for (let index = parts.length - 1; index >= 1; index -= 1) {
      const part = parts[index];
      if (/^[A-Za-z]{2}$/.test(part)) {
        const countryCode = part.toUpperCase();
        if (supportedCountries.some(country => country.id === countryCode)) {
          return countryCode;
        }
        break;
      }
    }
  }

  return undefined;
}
