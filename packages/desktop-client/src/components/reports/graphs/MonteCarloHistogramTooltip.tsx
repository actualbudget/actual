import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

type PayloadItem = {
  payload: {
    year: number;
    age: number;
    count: number;
  };
};

type MonteCarloHistogramTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  simulationCount: number;
};

export function MonteCarloHistogramTooltip({
  active,
  payload,
  simulationCount,
}: MonteCarloHistogramTooltipProps) {
  const { t } = useTranslation();

  if (active && payload && payload.length) {
    const point = payload[0].payload;
    return (
      <div
        className={css({
          zIndex: 1000,
          pointerEvents: 'none',
          borderRadius: 2,
          boxShadow: styles.chartTooltipShadow,
          backgroundColor: theme.menuBackground,
          color: theme.menuItemText,
          padding: 10,
        })}
      >
        {t(
          '{{failedCount}} of {{total}} scenarios ran out of money at age {{age}}',
          {
            failedCount: point.count,
            total: simulationCount,
            age: point.age,
          },
        )}
      </div>
    );
  }
  return null;
}
