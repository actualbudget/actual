import React, { type ReactNode } from 'react';

import {
  type GroupedEntity,
  type DataEntity,
} from 'loot-core/src/types/models/reports';

import { type CSSProperties, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Row } from '../../../table';

import { type renderRowProps } from './ReportTable';

type RenderRowProps = {
  index: number;
  parent_index?: number;
  compact: boolean;
  renderRow: (arg: renderRowProps) => ReactNode;
  intervalsCount: number;
  mode: string;
  metadata: GroupedEntity[];
  style?: CSSProperties;
  compactStyle?: CSSProperties;
};

function RenderRow({
  index,
  parent_index,
  compact,
  renderRow,
  intervalsCount,
  mode,
  metadata,
  style,
  compactStyle,
}: RenderRowProps) {
  const child = metadata[index];
  const parent =
    parent_index !== undefined ? metadata[parent_index] : ({} as GroupedEntity);

  const item =
    parent_index === undefined
      ? child
      : (parent.categories && parent.categories[index]) ||
        ({} as GroupedEntity);

  return (
    <View>
      {renderRow({
        item,
        mode,
        intervalsCount,
        compact,
        style,
        compactStyle,
      })}
    </View>
  );
}

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
                <RenderRow
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
                            <RenderRow
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
