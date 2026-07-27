import { describe, expect, it } from 'vitest';

import { ALL_WIDGET_METRICS, widgetMetricLabel } from './SummaryWidget';

const identity = (key: string) => key;

describe('widgetMetricLabel', () => {
  it('labels every known metric', () => {
    expect(widgetMetricLabel(identity, 'netWorth')).toBe('Net worth');
    expect(widgetMetricLabel(identity, 'toBudget')).toBe('To budget');
    expect(widgetMetricLabel(identity, 'onBudgetTotal')).toBe('On budget');
  });

  it('has a label for every entry in ALL_WIDGET_METRICS', () => {
    for (const metric of ALL_WIDGET_METRICS) {
      expect(widgetMetricLabel(identity, metric)).not.toBe(metric);
    }
  });
});
