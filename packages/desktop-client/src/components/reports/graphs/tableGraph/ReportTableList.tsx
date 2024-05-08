import React, { type ReactNode } from 'react';

import {
  type GroupedEntity,
  type DataEntity,
} from 'loot-core/src/types/models/reports';

import { type CSSProperties, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Row } from '../../../table';

type RenderRowProps = {
  index: number;
  parent_index?: number;
  compact: boolean;
  renderItem: (arg: {
    item: GroupedEntity;
    mode: string;
    intervalsCount: number;
    compact: boolean;
    style?: CSSProperties;
    compactStyle?: CSSProperties;
  }) => ReactNode;
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
  renderItem,
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

  const renderRow = renderItem({
    item,
    mode,
    intervalsCount,
    compact,
    style,
    compactStyle,
  });

  return <View>{renderRow}</View>;
}

type ReportTableListProps = {
  data: DataEntity;
  mode: string;
  intervalsCount: number;
  groupBy: string;
  renderItem: (arg: {
    item: GroupedEntity;
    mode: string;
    intervalsCount: number;
    compact: boolean;
    style?: CSSProperties;
    compactStyle?: CSSProperties;
  }) => ReactNode;
  compact: boolean;
  style?: CSSProperties;
  compactStyle?: CSSProperties;
};

export function ReportTableList({
  data,
  intervalsCount,
  mode,
  groupBy,
  renderItem,
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
                  renderItem={renderItem}
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
                              renderItem={renderItem}
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
