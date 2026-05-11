import type { ComponentType, SVGProps } from 'react';

import {
  SvgChartPie,
  SvgEquals,
  SvgMoneyBag,
  SvgPiggyBank,
  SvgShare,
  SvgTime,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import { t } from 'i18next';

import type { DisplayTemplateType } from './constants';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type DisplayTemplateMeta = {
  label: string;
  description: string;
  icon: IconComponent;
};

export function getDisplayTemplateMeta(
  displayType: DisplayTemplateType,
): DisplayTemplateMeta {
  switch (displayType) {
    case 'fixed':
      return {
        label: t('Fixed amount'),
        description: t('Add a set amount every month, week, day, or year.'),
        icon: SvgPiggyBank,
      };
    case 'schedule':
      return {
        label: t('Cover schedule'),
        description: t('Save up for a recurring scheduled transaction.'),
        icon: SvgCalendar3,
      };
    case 'by':
      return {
        label: t('Save by date'),
        description: t(
          'Spread a target amount across the months until a deadline.',
        ),
        icon: SvgMoneyBag,
      };
    case 'percentage':
      return {
        label: t('% of income'),
        description: t("A share of this month's or last month's income."),
        icon: SvgChartPie,
      };
    case 'historical':
      return {
        label: t('From history'),
        description: t(
          'Use past months: average, a specific month, or a copy.',
        ),
        icon: SvgTime,
      };
    case 'limit':
      return {
        label: t('Balance cap'),
        description: t(
          'Stop budgeting to this category once the balance reaches a cap.',
        ),
        icon: SvgEquals,
      };
    case 'refill':
      return {
        label: t('Refill to cap'),
        description: t(
          'Top the category back up to the balance cap each month.',
        ),
        icon: SvgArrowsSynchronize,
      };
    case 'remainder':
      return {
        label: t('Whatever is left'),
        description: t(
          'Split any remaining To Budget across these categories.',
        ),
        icon: SvgShare,
      };
    default:
      displayType satisfies never;
      throw new Error(`Unknown display type: ${String(displayType)}`);
  }
}
