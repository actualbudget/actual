// @ts-strict-ignore

import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { NetWorthGraph } from '../reports/graphs/NetWorthGraph';

import { Setting } from './UI';

import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function GraphSettings() {
  const { t } = useTranslation();

  const [_rechartGraphType, setRechartGraphType] =
    useSyncedPref('rechart-graph-type');
  const rechartGraphType = _rechartGraphType;
  return (
    <Setting
      primaryAction={
        <View
          style={{
            flexDirection: 'column',
            gap: '1em',
            width: '100%',
          }}
        >
          <View style={{ gap: '0.5em' }}>
            <Text style={{ fontWeight: 500 }}>{t('Graph Type')}</Text>
            <View style={{ alignItems: 'flex-start', gap: '1em' }}>
              <Select
                value={rechartGraphType}
                onChange={type => setRechartGraphType(type)}
                options={[
                  ['linear', 'Sharp'],
                  ['monotone', 'Smooth'],
                ]}
              />
            </View>
          </View>
          <NetWorthGraph
            style={{ height: 150 }}
            graphData={{
              data: [
                {
                  x: 'Dec ’24',
                  y: 3812.92,
                  assets: '42,996.00',
                  debt: '-4,869.08',
                  change: '0.00',
                  networth: '38,126.92',
                  date: 'December 2024',
                },
                {
                  x: 'Jan ’25',
                  y: 4226.34,
                  assets: '48,543.37',
                  debt: '-6,276.03',
                  change: '4,140.42',
                  networth: '42,267.34',
                  date: 'January 2025',
                },
                {
                  x: 'Feb ’25',
                  y: 1168.3,
                  assets: '46,346.60',
                  debt: '-4,657.30',
                  change: '-578.04',
                  networth: '41,689.30',
                  date: 'February 2025',
                },
                {
                  x: 'Mar ’25',
                  y: 4170.78,
                  assets: '45,779.62',
                  debt: '-4,077.84',
                  change: '12.48',
                  networth: '41,701.78',
                  date: 'March 2025',
                },
                {
                  x: 'Apr ’25',
                  y: 8143.57,
                  assets: '90,852.01',
                  debt: '-9,414.44',
                  change: '39,735.79',
                  networth: '81,437.57',
                  date: 'April 2025',
                },
                {
                  x: 'May ’25',
                  y: 5031,
                  assets: '60,485.16',
                  debt: '-10,171.16',
                  change: '-31,123.57',
                  networth: '50,314.00',
                  date: 'May 2025',
                },
              ],
              hasNegative: false,
              start: '2024-12',
              end: '2025-05',
            }}
          />
        </View>
      }
    >
      <Text>
        <Trans>
          <strong>Graph Type</strong> determines the appearance of the graph.
        </Trans>
      </Text>
    </Setting>
  );
}
