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
  /** One-line explanation of the page, shown under the page title. */
  description: string;
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
    budget: {
      title: t('Budget'),
      description: t("Plan where each month's money goes."),
      Icon: SvgWallet,
    },
    reports: {
      title: t('Reports'),
      description: t(
        'Charts and summaries of your spending, income and net worth.',
      ),
      Icon: SvgReports,
    },
    schedules: {
      title: t('Schedules'),
      description: t(
        'Bills and income you expect on a regular basis. See what is coming up, catch anything missed, and let the app enter the transactions for you.',
      ),
      Icon: SvgCalendar3,
    },
    payees: {
      title: t('Payees'),
      description: t(
        'Everyone you pay or receive money from. Merge duplicates and set up rules to keep transactions tidy.',
      ),
      Icon: SvgUserGroup,
    },
    tags: {
      title: t('Tags'),
      description: t(
        'Words starting with # that you add to transaction notes to group spending across categories.',
      ),
      Icon: SvgTag,
    },
    rules: {
      title: t('Rules'),
      description: t(
        'Automatic edits applied to matching transactions, such as setting the category for a payee. Great for cleaning up imports.',
      ),
      Icon: SvgTuning,
    },
    'bank-sync': {
      title: t('Bank Sync'),
      description: t(
        'Connect accounts to your bank so new transactions download automatically.',
      ),
      Icon: SvgLibrary,
    },
  };
}
