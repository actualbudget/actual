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
      fxImpactReportAvailable: false,
    });

    const enabled = getDashboardWidgetItems({
      t: value => value,
      customReports: [],
      formulaMode: false,
      crossoverReportEnabled: false,
      budgetAnalysisReportEnabled: false,
      balanceForecastReportEnabled: true,
      fxImpactReportAvailable: false,
    });

    expect(getNames(disabled)).not.toContain('balance-forecast-card');
    expect(getNames(enabled)).toContain('balance-forecast-card');
  });

  it('offers the FX impact report only while multicurrency is available', () => {
    const options = {
      t: (value: string) => value,
      customReports: [{ id: 'abc', name: 'Custom Budget Review' }],
      formulaMode: false,
      crossoverReportEnabled: false,
      budgetAnalysisReportEnabled: false,
      balanceForecastReportEnabled: false,
    };
    expect(
      getNames(
        getDashboardWidgetItems({ ...options, fxImpactReportAvailable: false }),
      ),
    ).not.toContain('fx-impact-card');
    const items = getDashboardWidgetItems({
      ...options,
      fxImpactReportAvailable: true,
    });
    const names = getNames(items);
    expect(names.indexOf('fx-impact-card')).toBe(
      names.indexOf('markdown-card') - 1,
    );
    expect(
      items.find(item => item !== Menu.line && item.name === 'fx-impact-card'),
    ).toMatchObject({ text: 'FX impact' });
  });

  it('keeps custom report entries after a divider', () => {
    const items = getDashboardWidgetItems({
      t: value => value,
      customReports: [{ id: 'abc', name: 'Custom Budget Review' }],
      formulaMode: false,
      crossoverReportEnabled: false,
      budgetAnalysisReportEnabled: false,
      balanceForecastReportEnabled: false,
      fxImpactReportAvailable: false,
    });

    expect(items).toContain(Menu.line);
    expect(getNames(items)).toContain('custom-report-abc');
  });
});
