import * as localesNamespace from 'date-fns/locale';

// Spread into plain object to allow dynamic access without ESLint namespace warnings
const locales: Record<string, localesNamespace.Locale> = {
  ...localesNamespace,
};

/**
 * Map app / browser language tags to date-fns locale export names.
 * Keys are lowercased with hyphens/underscores removed.
 * date-fns uses camelCase: zhCN, zhTW, zhHK, ptBR, enUS, …
 */
const LANGUAGE_TO_DATE_FNS: Partial<
  Record<string, keyof typeof localesNamespace>
> = {
  // Chinese: app uses zh-Hans / zh-Hant; browsers often zh-CN / zh-TW / zh-HK
  zh: 'zhCN',
  zhhans: 'zhCN',
  zhcn: 'zhCN',
  zhhant: 'zhTW',
  zhtw: 'zhTW',
  zhhk: 'zhHK',
};

function normalizeLanguageTag(language: string): string {
  return language.trim().toLowerCase().replace(/[-_]/g, '');
}

/**
 * Resolve a BCP-47 language tag to a date-fns Locale.
 * Never throws; unknown tags fall back to enUS.
 */
export function getLocale(
  language: string | null | undefined,
): localesNamespace.Locale {
  if (!language || typeof language !== 'string') {
    return locales.enUS;
  }

  const normalized = normalizeLanguageTag(language);
  if (!normalized) {
    return locales.enUS;
  }

  // 1) Explicit aliases (zh-Hans → zhCN, etc.)
  const aliased = LANGUAGE_TO_DATE_FNS[normalized];
  if (aliased) {
    return locales[aliased];
  }

  // 2) BCP-47 segments → date-fns keys (pt-BR → ptBR, en-GB → enGB)
  // date-fns uses language lowercase + region uppercase (not title case).
  const languageParts = language
    .trim()
    .replace(/_/g, '-')
    .split('-')
    .filter(Boolean);
  const stripped = languageParts
    .map((part, i) => (i === 0 ? part.toLowerCase() : part.toUpperCase()))
    .join('');

  if (stripped && stripped in locales) {
    return locales[stripped];
  }

  // 3) Two-letter language only (nb-NO → nb, de-AT → de)
  const primaryLanguage = languageParts[0]?.toLowerCase();
  if (primaryLanguage?.length === 2 && primaryLanguage in locales) {
    return locales[primaryLanguage];
  }

  return locales.enUS;
}
