import { useMemo } from 'react';

import { useLocale } from './useLocale';
import { useSyncedPref } from './useSyncedPref';

export function useFirstDayOfWeek(): Day {
  const [firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const locale = useLocale();

  return useMemo(() => {
    if (
      firstDayOfWeekIdx !== undefined &&
      !Number.isNaN(parseInt(firstDayOfWeekIdx)) &&
      parseInt(firstDayOfWeekIdx) >= 0 &&
      parseInt(firstDayOfWeekIdx) <= 6
    ) {
      return parseInt(firstDayOfWeekIdx);
    }

    try {
      const localeObj = new Intl.Locale(locale.code || 'en');
      // @ts-expect-error https://github.com/microsoft/TypeScript/issues/61713
      const { firstDay } = localeObj.getWeekInfo();
      // `firstDay` is 1–7 (Monday–Sunday).
      // We convert to 0–6 (Sunday–Saturday) to follow Pikaday’s numbering.
      return firstDay === 7 ? 0 : firstDay;
    } catch (error) {
      return 0;
    }
  }, [firstDayOfWeekIdx, locale]);
}
