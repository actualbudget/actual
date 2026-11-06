import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  ForecastAssumptions,
  ForecastSource,
} from '@actual-app/core/types/models/forecast';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

export function ForecastAssumptionsSummary({
  assumptions,
  source,
  baselineBalance,
  nominalBalance,
}: {
  assumptions: ForecastAssumptions;
  source: ForecastSource;
  baselineBalance?: number;
  nominalBalance?: number;
}) {
  const format = useFormat();
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {baselineBalance != null && (
          <View>
            <Trans>Baseline (nominal)</Trans>:{' '}
            <FinancialText>
              <PrivacyFilter>
                {format(baselineBalance, 'financial')}
              </PrivacyFilter>
            </FinancialText>
          </View>
        )}
        {nominalBalance != null && (
          <View>
            <Trans>With salary growth (nominal)</Trans>:{' '}
            <FinancialText>
              <PrivacyFilter>
                {format(nominalBalance, 'financial')}
              </PrivacyFilter>
            </FinancialText>
          </View>
        )}
      </View>
    </View>
  );
}
