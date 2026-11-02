import * as monthUtils from '@actual-app/core/shared/months';

import { useDateFormat } from '#hooks/useDateFormat';
import { useLocale } from '#hooks/useLocale';

/**
 * Formats the past window an offset baseline compares an interval with.
 * Range baselines don't give intervals a window, so they get null.
 */
export function useFormatBaselineWindow() {
  const locale = useLocale();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  return (startDate: string | undefined, endDate: string | undefined) =>
    startDate && endDate
      ? `${monthUtils.format(startDate, dateFormat, locale)} – ${monthUtils.format(endDate, dateFormat, locale)}`
      : null;
}
