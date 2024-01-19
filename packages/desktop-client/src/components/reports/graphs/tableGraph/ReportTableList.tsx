// @ts-strict-ignore
import React from 'react';

import { type DataEntity } from 'loot-core/src/types/models/reports';

import { type CSSProperties, theme } from '../../../../style';
import { View } from '../../../common/View';
import { Cell, Row } from '../../../table';

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
  };
  function RenderRow({ index, parent_index, style }: RenderRowProps) {
    const item = parent_index === undefined
      ? data[index]
      : data[parent_index].categories[index];

    return renderItem({
      item,
      groupByItem,
      mode,
      style,
      monthsCount,
    });
  }

  return (
    <View>
      {data.map((item, index) => {
        return (
          <View key={item.id}>
            {data ? (
              <>
                <RenderRow
                  index={index}
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
                            index={i}
                            parent_index={index}
                          />
                        );
                      })}
                    </View>
                    <Row height={20} />
                  </>
                )}
              </>
            ) : (
              <Cell width="flex" />
            )}
          </View>
        );
      })}
    </View>
  );
}
