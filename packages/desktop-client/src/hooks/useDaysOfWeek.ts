import { useTranslation } from 'react-i18next';

// 0 = Sunday, 1 = Monday, ... 6 = Saturday
export function useDaysOfWeek() {
  const { t } = useTranslation();

  const daysOfWeek = {
    0: t('Sunday'),
    1: t('Monday'),
    2: t('Tuesday'),
    3: t('Wednesday'),
    4: t('Thursday'),
    5: t('Friday'),
    6: t('Saturday'),
  } satisfies Record<number, string>;

  return daysOfWeek;
}
