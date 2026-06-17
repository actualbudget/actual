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

import type { Mark } from 'loot-core/types/chart-spec';

import { GraphButton } from '@desktop-client/components/reports/GraphButton';

type Option = {
  mark: Mark;
  icon: ReactNode;
  label: string;
  enabled: boolean;
};

const OPTIONS: Option[] = [
  {
    mark: 'table',
    icon: <SvgQueue width={15} height={15} />,
    label: 'Table',
    enabled: true,
  },
  {
    mark: 'number',
    icon: <SvgChart width={15} height={15} />,
    label: 'Number',
    enabled: true,
  },
  {
    mark: 'column',
    icon: <SvgChartBar width={15} height={15} />,
    label: 'Column',
    enabled: false,
  },
  {
    mark: 'bar',
    icon: (
      <SvgChartBar
        width={15}
        height={15}
        style={{ transform: 'rotate(90deg)' }}
      />
    ),
    label: 'Bar',
    enabled: false,
  },
  {
    mark: 'line',
    icon: <SvgChart width={15} height={15} />,
    label: 'Line',
    enabled: false,
  },
  {
    mark: 'area',
    icon: <SvgChart width={15} height={15} />,
    label: 'Area',
    enabled: false,
  },
  {
    mark: 'point',
    icon: <SvgChart width={15} height={15} />,
    label: 'Point',
    enabled: false,
  },
  {
    mark: 'arc',
    icon: <SvgChartPie width={15} height={15} />,
    label: 'Arc',
    enabled: false,
  },
];

type MarkSelectorProps = {
  value: Mark;
  onChange: (mark: Mark) => void;
};

export function MarkSelector({ value, onChange }: MarkSelectorProps) {
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
          key={option.mark}
          selected={value === option.mark}
          title={
            option.enabled
              ? t(option.label)
              : t(`${option.label} (coming soon)`)
          }
          onSelect={option.enabled ? () => onChange(option.mark) : undefined}
          disabled={!option.enabled}
          style={{
            padding: 6,
            border: `1px solid ${
              value === option.mark
                ? theme.buttonPrimaryBackground
                : 'transparent'
            }`,
            borderRadius: 4,
            opacity: option.enabled ? 1 : 0.4,
          }}
        >
          {option.icon}
        </GraphButton>
      ))}
    </View>
  );
}
