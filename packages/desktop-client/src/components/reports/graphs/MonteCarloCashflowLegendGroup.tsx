import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { MonteCarloCashflowSwatch } from '#components/reports/graphs/MonteCarloCashflowSwatch';
import type { MonteCarloCashflowSeries } from '#components/reports/graphs/util/monteCarloCashflowChart';
import { GROUP_HEADING_STYLE } from '#components/reports/reports/monte-carlo/monteCarloStyles';

type MonteCarloCashflowLegendGroupProps = {
  heading: string;
  series: MonteCarloCashflowSeries[];
};

/** One heading + swatch-row group of the cashflow chart's legend */
export function MonteCarloCashflowLegendGroup({
  heading,
  series,
}: MonteCarloCashflowLegendGroupProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={GROUP_HEADING_STYLE}>{heading}</Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 15,
          rowGap: 4,
        }}
      >
        {series.map(entry => (
          <View
            key={entry.key}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <MonteCarloCashflowSwatch color={entry.color} size={12} />
            <Text>{entry.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
