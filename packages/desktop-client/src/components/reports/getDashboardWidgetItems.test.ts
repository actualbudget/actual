import { Menu } from '@actual-app/components/menu';
import { describe, expect, it } from 'vitest';

import { getDashboardWidgetItems } from './getDashboardWidgetItems';

function getNames(items: ReturnType<typeof getDashboardWidgetItems>) {
  return items.filter(item => item !== Menu.line).map(item => item.name);
}

describe('getDashboardWidgetItems', () => {
  it('includes the balance forecast card only when the flag is enabled', () => {
    const disabled = getDashboardWidgetItems({
      t: value => value,
      customReports: [],
      formulaMode: false,
      crossoverReportEnabled: false,
      budgetAnalysisReportEnabled: false,
      balanceForecastReportEnabled: false,
    });

    const enabled = getDashboardWidgetItems({
      t: value => value,
      customReports: [],
      formulaMode: false,
      crossoverReportEnabled: false,
      budgetAnalysisReportEnabled: false,
      balanceForecastReportEnabled: true,
    });

    expect(getNames(disabled)).not.toContain('balance-forecast-card');
    expect(getNames(enabled)).toContain('balance-forecast-card');
  });

  it('keeps custom report entries after a divider', () => {
    const items = getDashboardWidgetItems({
      t: value => value,
      customReports: [{ id: 'abc', name: 'Custom Budget Review' }],
      formulaMode: false,
      crossoverReportEnabled: false,
      budgetAnalysisReportEnabled: false,
      balanceForecastReportEnabled: false,
    });

    expect(items).toContain(Menu.line);
    expect(getNames(items)).toContain('custom-report-abc');
  });
});
