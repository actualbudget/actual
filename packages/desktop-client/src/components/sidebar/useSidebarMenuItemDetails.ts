import type { ComponentType, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SvgLibrary,
  SvgReports,
  SvgTag,
  SvgTuning,
  SvgUserGroup,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import { SvgCalendar3 } from '@actual-app/components/icons/v2';

import type { SidebarMenuItemId } from './sidebarMenu';

type SidebarMenuItemDetails = {
  title: string;
  Icon:
    | ComponentType<SVGProps<SVGElement>>
    | ComponentType<SVGProps<SVGSVGElement>>;
};

export function useSidebarMenuItemDetails(): Record<
  SidebarMenuItemId,
  SidebarMenuItemDetails
> {
  const { t } = useTranslation();

  return {
    budget: { title: t('Budget'), Icon: SvgWallet },
    reports: { title: t('Reports'), Icon: SvgReports },
    schedules: { title: t('Schedules'), Icon: SvgCalendar3 },
    payees: { title: t('Payees'), Icon: SvgUserGroup },
    tags: { title: t('Tags'), Icon: SvgTag },
    rules: { title: t('Rules'), Icon: SvgTuning },
    'bank-sync': { title: t('Bank Sync'), Icon: SvgLibrary },
  };
}
