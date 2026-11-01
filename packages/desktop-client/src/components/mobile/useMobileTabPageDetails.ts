import { useTranslation } from 'react-i18next';

import {
  SvgAdd,
  SvgPiggyBank,
  SvgReports,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import { SvgCalendar3 } from '@actual-app/components/icons/v2';

import type { MobileStartPageId } from './mobileStartPage';

export function useMobileTabPageDetails() {
  const { t } = useTranslation();

  return {
    budget: { title: t('Budget'), Icon: SvgWallet },
    transaction: { title: t('Transaction'), Icon: SvgAdd },
    accounts: { title: t('Accounts'), Icon: SvgPiggyBank },
    reports: { title: t('Reports'), Icon: SvgReports },
    schedules: { title: t('Schedules'), Icon: SvgCalendar3 },
  } satisfies Record<MobileStartPageId, unknown>;
}
