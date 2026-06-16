import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SvgChart,
  SvgChartBar,
  SvgChartPie,
  SvgQueue,
} from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { QueryVisualization as QueryVisualizationType } from 'loot-core/types/models/dashboard';

import { GraphButton } from '@desktop-client/components/reports/GraphButton';

export type VisualizationType = QueryVisualizationType['type'];

type Option = {
  type: VisualizationType;
  icon: ReactNode;
  label: string;
};

const OPTIONS: Option[] = [
  { type: 'table', icon: <SvgQueue width={15} height={15} />, label: 'Table' },
  { type: 'bar', icon: <SvgChartBar width={15} height={15} />, label: 'Bar' },
  {
    type: 'time-series',
    icon: <SvgChart width={15} height={15} />,
    label: 'Time-series',
  },
  {
    type: 'donut',
    icon: <SvgChartPie width={15} height={15} />,
    label: 'Donut',
  },
];

type QueryVizTypeSelectorProps = {
  value: VisualizationType;
  onChange: (type: VisualizationType) => void;
};

export function QueryVizTypeSelector({
  value,
  onChange,
}: QueryVizTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {OPTIONS.map(option => (
        <GraphButton
          key={option.type}
          selected={value === option.type}
          title={t(option.label)}
          onSelect={() => onChange(option.type)}
          style={{
            padding: 6,
            border: `1px solid ${
              value === option.type
                ? theme.buttonPrimaryBackground
                : 'transparent'
            }`,
            borderRadius: 4,
          }}
        >
          {option.icon}
        </GraphButton>
      ))}
    </View>
  );
}
