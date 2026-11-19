import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { PrivacyFilter } from '#components/PrivacyFilter';

export function ForecastSeriesKey({
  index,
  name,
}: {
  index: number;
  name: string;
}) {
  const style = getForecastSeriesStyle(index);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
      }}
    >
      <svg width={24} height={12} aria-hidden="true" style={{ flexShrink: 0 }}>
        <line x1={0} y1={6} x2={24} y2={6} strokeWidth={2} {...style} />
      </svg>
      <PrivacyFilter>
        <span style={{ overflowWrap: 'anywhere' }}>{name}</span>
      </PrivacyFilter>
    </View>
  );
}

export function getForecastSeriesStyle(index: number) {
  return {
    stroke: [
      theme.reportsChartFill,
      theme.reportsBlue,
      theme.reportsRed,
      theme.reportsGray,
    ][index % 4],
    strokeDasharray: [undefined, '8 4', '3 3', '10 3 2 3'][index % 4],
  };
}
