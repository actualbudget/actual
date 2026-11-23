import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  ForecastAssumptions,
  ForecastSource,
} from '@actual-app/core/types/models/forecast';

export function ForecastAssumptionsSummary({
  assumptions,
  source,
  showsBaseline = false,
}: {
  assumptions: ForecastAssumptions;
  source: ForecastSource;
  /** Explain the dashed line when the chart draws the baseline beside it. */
  showsBaseline?: boolean;
}) {
  const anchorDate = assumptions.anchorDate;
  const inflation = Number((assumptions.inflationRate * 100).toFixed(4));
  const growth =
    source === 'schedules'
      ? Number((assumptions.salaryGrowthRate * 100).toFixed(4))
      : 0;
  return (
    <View
      data-testid="forecast-assumptions-summary"
      style={{ fontSize: 12, gap: 5, color: theme.pageTextLight }}
    >
      <View>
        <Trans>
          Purchasing power in {{ anchorDate }} money · Inflation {{ inflation }}
          % per year · Salary growth {{ growth }}% per year
        </Trans>
      </View>
      {showsBaseline && (
        <View>
          <Trans>
            Solid line: purchasing power. Dashed line: baseline forecast without
            assumptions.
          </Trans>
        </View>
      )}
    </View>
  );
}
