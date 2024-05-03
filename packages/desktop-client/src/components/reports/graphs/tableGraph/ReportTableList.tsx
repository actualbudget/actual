// @ts-strict-ignore
import React from 'react';

import { type GroupedEntity } from 'loot-core/src/types/models/reports';

import { type CSSProperties, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Row } from '../../../table';

type ReportTableListProps = {
  data: GroupedEntity;
  mode?: string;
  intervalsCount?: number;
  groupBy: string;
  renderItem;
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
  const groupByData =
    groupBy === 'Category'
      ? 'groupedData'
      : groupBy === 'Interval'
        ? 'intervalData'
        : 'data';
  const metadata = data[groupByData];

  type RenderRowProps = {
    index: number;
    parent_index?: number;
    compact: boolean;
    style?: CSSProperties;
    compactStyle?: CSSProperties;
  };
  function RenderRow({
    index,
    parent_index,
    compact,
    style,
    compactStyle,
  }: RenderRowProps) {
    const item =
      parent_index === undefined
        ? metadata[index]
        : metadata[parent_index].categories[index];

    return renderItem({
      item,
      mode,
      intervalsCount,
      compact,
      style,
      compactStyle,
    });
  }

  return (
    <View>
      {metadata ? (
        <View>
          {metadata.map((item, index) => {
            return (
              <View key={item.id}>
                <RenderRow
                  index={index}
                  compact={compact}
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
                      {item.categories.map((category, i) => {
                        return (
                          <RenderRow
                            key={category.id}
                            index={i}
                            compact={compact}
                            parent_index={index}
                            style={style}
                            compactStyle={compactStyle}
                          />
                        );
                      })}
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
