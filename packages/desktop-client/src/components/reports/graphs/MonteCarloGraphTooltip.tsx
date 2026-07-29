import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { FinancialText } from '#components/FinancialText';
import { useFormat } from '#hooks/useFormat';

export type MonteCarloGraphView =
  | 'all'
  | 'single-worst'
  | 'worst-case'
  | 'pessimistic'
  | 'median'
  | 'optimistic';

export type FanChartDataPoint = {
  year: number;
  age: number;
  band80: [number, number];
  band50: [number, number];
  p5: number;
  p10: number;
  p25: number;
  p30: number;
  p50: number;
  p70: number;
  p75: number;
  p90: number;
  worstRun?: number;
};

// Single source of truth for which data point each focused view plots -
// the graph draws this key and the tooltip reads the same one
export const VIEW_DATA_KEYS = {
  'single-worst': 'worstRun',
  'worst-case': 'p5',
  pessimistic: 'p30',
  median: 'p50',
  optimistic: 'p70',
} as const satisfies Record<
  Exclude<MonteCarloGraphView, 'all'>,
  keyof FanChartDataPoint
>;

type PayloadItem = {
  payload: FanChartDataPoint;
};

type MonteCarloGraphTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  view?: MonteCarloGraphView;
};

export function MonteCarloGraphTooltip({
  active,
  payload,
  view = 'all',
}: MonteCarloGraphTooltipProps) {
  const { t } = useTranslation();
  const format = useFormat();

  if (active && payload && payload.length) {
    const point = payload[0].payload;
    const singleViewLabels: Record<
      Exclude<MonteCarloGraphView, 'all'>,
      string
    > = {
      'single-worst': t('Single worst run:'),
      'worst-case': t('Worst-case (5th percentile):'),
      pessimistic: t('Pessimistic (30th percentile):'),
      median: t('Median (50th percentile):'),
      optimistic: t('Optimistic (70th percentile):'),
    };
    const rows =
      view === 'all'
        ? [
            { label: t('Best 10%:'), value: point.p90 },
            { label: t('Top quartile:'), value: point.p75 },
            { label: t('Median:'), value: point.p50 },
            { label: t('Bottom quartile:'), value: point.p25 },
            { label: t('Worst 10%:'), value: point.p10 },
          ]
        : [
            {
              label: singleViewLabels[view],
              value: point[VIEW_DATA_KEYS[view]] ?? 0,
            },
          ];
    return (
      <div
        className={css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          padding: 10,
        })}
      >
        <div style={{ marginBottom: 10 }}>
          <strong>
            {point.year === 0
              ? t('Start (age {{age}})', { age: point.age })
              : t('Age {{age}}', { age: point.age })}
          </strong>
        </div>
        <div style={{ lineHeight: 1.5 }}>
          {rows.map(row => (
            <View
              key={row.label}
              className={css({
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 20,
              })}
            >
              <div>{row.label}</div>
              <div>
                <FinancialText>{format(row.value, 'financial')}</FinancialText>
              </div>
            </View>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
