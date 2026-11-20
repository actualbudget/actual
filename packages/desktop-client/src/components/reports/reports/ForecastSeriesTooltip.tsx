import { theme } from '@actual-app/components/theme';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

import type { ForecastChartLine } from './balanceForecastSeries';
import { ForecastSeriesKey } from './ForecastSeriesKey';

export function ForecastSeriesTooltip({
  date,
  lines,
}: {
  date: string;
  lines: ForecastChartLine[];
}) {
  const format = useFormat();
  return (
    <div
      style={{
        borderRadius: 2,
        boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
        backgroundColor: theme.menuBackground,
        color: theme.menuItemText,
        padding: 10,
      }}
    >
      <strong>{date}</strong>
      {lines.map((line, index) => {
        const point = line.points.find(point => point.date === date);
        return (
          point && (
            <div
              key={line.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                marginTop: 8,
              }}
            >
              <ForecastSeriesKey index={index} name={line.name} />
              <FinancialText>
                <PrivacyFilter>
                  {format(point.balance, 'financial')}
                </PrivacyFilter>
              </FinancialText>
            </div>
          )
        );
      })}
    </div>
  );
}
