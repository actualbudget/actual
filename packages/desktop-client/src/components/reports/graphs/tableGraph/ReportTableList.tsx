// @ts-strict-ignore
import React from 'react';

import { type DataEntity } from 'loot-core/src/types/models/reports';

import { type CSSProperties, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Row } from '../../../table';

type ReportTableListProps = {
  data: DataEntity[];
  mode?: string;
  monthsCount?: number;
  groupBy: string;
  renderItem;
  compact: boolean;
};

export function ReportTableList({
  data,
  monthsCount,
  mode,
  groupBy,
  renderItem,
  compact,
}: ReportTableListProps) {
  const groupByItem = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';

  type RenderRowProps = {
    index: number;
    parent_index?: number;
    style?: CSSProperties;
    compact: boolean;
  };
  function RenderRow({ index, parent_index, style, compact }: RenderRowProps) {
    const item =
      parent_index === undefined
        ? data[index]
        : data[parent_index].categories[index];

    return renderItem({
      item,
      groupByItem,
      mode,
      style,
      monthsCount,
      compact,
    });
  }

  return (
    <View>
      {data ? (
        <View>
          {data.map((item, index) => {
            return (
              <View key={item.id}>
                <RenderRow
                  index={index}
                  compact={compact}
                  style={
                    item.categories && {
                      color: theme.tableRowHeaderText,
                      backgroundColor: theme.tableRowHeaderBackground,
                      fontWeight: 600,
                    }
                  }
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
