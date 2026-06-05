import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';

type CustomReportSummary = {
  id: string;
  name: string;
};

type Translate = (key: string) => string;

type GetDashboardWidgetItemsParams = {
  t: Translate;
  customReports: CustomReportSummary[];
  formulaMode: boolean;
  crossoverReportEnabled: boolean;
  budgetAnalysisReportEnabled: boolean;
  balanceForecastReportEnabled: boolean;
};

type DashboardWidgetMenuName =
  | 'balance-forecast-card'
  | 'budget-analysis-card'
  | 'calendar-card'
  | 'cash-flow-card'
  | 'crossover-card'
  | 'custom-report'
  | 'formula-card'
  | 'markdown-card'
  | 'net-worth-card'
  | 'spending-card'
  | 'summary-card'
  | `custom-report-${string}`;

function findItemIndex(
  items: MenuItem<DashboardWidgetMenuName>[],
  name: string,
) {
  const index = items.findIndex(
    item => item !== Menu.line && item.name === name,
  );
  return index === -1 ? items.length : index;
}

export function getDashboardWidgetItems({
  t,
  customReports,
  formulaMode,
  crossoverReportEnabled,
  budgetAnalysisReportEnabled,
  balanceForecastReportEnabled,
}: GetDashboardWidgetItemsParams): MenuItem<DashboardWidgetMenuName>[] {
  const items: MenuItem<DashboardWidgetMenuName>[] = [
    {
      name: 'cash-flow-card',
      text: t('Cash flow graph'),
    },
    {
      name: 'net-worth-card',
      text: t('Net worth graph'),
    },
    {
      name: 'spending-card',
      text: t('Spending analysis'),
    },
    {
      name: 'markdown-card',
      text: t('Text widget'),
    },
    {
      name: 'summary-card',
      text: t('Summary card'),
    },
    {
      name: 'calendar-card',
      text: t('Calendar card'),
    },
    {
      name: 'custom-report',
      text: t('New custom report'),
    },
  ];

  if (crossoverReportEnabled) {
    items.splice(2, 0, {
      name: 'crossover-card',
      text: t('Crossover point'),
    });
  }

  if (budgetAnalysisReportEnabled) {
    items.splice(findItemIndex(items, 'markdown-card'), 0, {
      name: 'budget-analysis-card',
      text: t('Budget analysis'),
    });
  }

  if (balanceForecastReportEnabled) {
    items.splice(findItemIndex(items, 'markdown-card'), 0, {
      name: 'balance-forecast-card',
      text: t('Balance forecast'),
    });
  }

  if (formulaMode) {
    items.splice(findItemIndex(items, 'custom-report'), 0, {
      name: 'formula-card',
      text: t('Formula card'),
    });
  }

  if (customReports.length) {
    items.push(Menu.line);
    items.push(
      ...customReports.map(report => ({
        name: `custom-report-${report.id}`,
        text: report.name,
      })),
    );
  }

  return items;
}
