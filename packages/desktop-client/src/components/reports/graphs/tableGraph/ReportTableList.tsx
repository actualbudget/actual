import React, { type ReactNode } from 'react';

import {
  type GroupedEntity,
  type DataEntity,
} from 'loot-core/src/types/models/reports';

import { type CSSProperties, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Row } from '../../../table';

import { RenderTableRow } from './RenderTableRow';
import { type renderRowProps } from './ReportTable';

type ReportTableListProps = {
  data: DataEntity;
  mode: string;
  intervalsCount: number;
  groupBy: string;
  renderRow: (arg: renderRowProps) => ReactNode;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
};

export function ReportTableList({
  data,
  intervalsCount,
  mode,
  groupBy,
  renderRow,
  compact,
  style,
  compactStyle,
}: ReportTableListProps) {
  const metadata: GroupedEntity[] | undefined =
    groupBy === 'Category'
      ? data.groupedData || []
      : groupBy === 'Interval'
        ? data.intervalData.map(interval => {
            return {
              id: '',
              name: '',
              date: interval.date,
              totalAssets: interval.totalAssets,
              totalDebts: interval.totalDebts,
              totalTotals: interval.totalTotals,
              intervalData: [],
              categories: [],
            };
          })
        : data.data;

  return (
    <View>
      {metadata ? (
        <View>
          {metadata.map((item, index) => {
            return (
              <View key={index}>
                <RenderTableRow
                  index={index}
                  compact={compact}
                  renderRow={renderRow}
                  intervalsCount={intervalsCount}
                  mode={mode}
                  metadata={metadata}
                  style={{
                    ...(item.categories && {
                      color: theme.tableRowHeaderText,
                      backgroundColor: theme.tableRowHeaderBackground,
                      fontWeight: 600,
                    }),
                    ...style,
                  }}
                  compactStyle={compactStyle}
                />
                {item.categories && (
                  <>
                    <View>
                      {item.categories.map(
                        (category: GroupedEntity, i: number) => {
                          return (
                            <RenderTableRow
                              key={category.id}
                              index={i}
                              compact={compact}
                              renderRow={renderRow}
                              intervalsCount={intervalsCount}
                              mode={mode}
                              metadata={metadata}
                              parent_index={index}
                              style={style}
                              compactStyle={compactStyle}
                            />
                          );
                        },
                      )}
                    </View>
                    <Row height={20} />
                  </>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View width="flex" />
      )}
    </View>
  );
}
