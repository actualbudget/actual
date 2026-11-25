import { Trans } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

import type { ForecastChartLine } from './balanceForecastSeries';
import { ForecastSeriesKey } from './ForecastSeriesKey';

export function ForecastSeriesSummary({
  lines,
  compact = false,
  isHovered = false,
}: {
  lines: ForecastChartLine[];
  compact?: boolean;
  isHovered?: boolean;
}) {
  const format = useFormat();
  return (
    <View style={{ overflow: 'auto', marginBottom: compact ? 4 : 16 }}>
      <table
        style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
      >
        <thead>
          <tr style={{ color: theme.pageTextLight }}>
            <th
              scope="col"
              style={{
                textAlign: 'left',
                fontWeight: 400,
                paddingBottom: compact ? 4 : 8,
              }}
            >
              <Trans>Line</Trans>
            </th>
            <th
              scope="col"
              style={{
                textAlign: 'right',
                fontWeight: 400,
                paddingBottom: compact ? 4 : 8,
              }}
            >
              <Trans>Ending Balance</Trans>
            </th>
            {!compact && (
              <th
                scope="col"
                style={{
                  textAlign: 'right',
                  fontWeight: 400,
                  paddingBottom: 8,
                }}
              >
                <Trans>Lowest visible point</Trans>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id}>
              <th
                scope="row"
                style={{
                  textAlign: 'left',
                  fontWeight: 400,
                  padding: compact ? '2px 12px 2px 0' : '4px 12px 4px 0',
                }}
              >
                <ForecastSeriesKey index={index} name={line.name} />
              </th>
              <td
                style={{
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  padding: compact ? '2px 0' : '4px 0',
                }}
              >
                {line.endingPoint ? (
                  <FinancialText>
                    <PrivacyFilter
                      activationFilters={compact ? [!isHovered] : undefined}
                    >
                      {format(line.endingPoint.balance, 'financial')}
                    </PrivacyFilter>
                  </FinancialText>
                ) : (
                  <Trans>No data</Trans>
                )}
              </td>
              {!compact && (
                <td
                  style={{
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    padding: '4px 0 4px 16px',
                  }}
                >
                  {line.lowestPoint ? (
                    <>
                      <FinancialText>
                        <PrivacyFilter>
                          {format(line.lowestPoint.balance, 'financial')}
                        </PrivacyFilter>
                      </FinancialText>{' '}
                      <span style={{ color: theme.pageTextLight }}>
                        ({line.lowestPoint.date})
                      </span>
                    </>
                  ) : (
                    <Trans>No data</Trans>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </View>
  );
}
