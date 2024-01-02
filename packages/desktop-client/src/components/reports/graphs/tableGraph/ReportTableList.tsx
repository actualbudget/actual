import React from 'react';

import { type CSSProperties, theme } from '../../../../style';
import View from '../../../common/View';
import { Cell, Row } from '../../../table';
import { type GroupedEntity } from '../../entities';

type ReportTableListProps = {
  data: GroupedEntity[];
  mode?: string;
  monthsCount?: number;
  groupBy: string;
  renderItem;
};

export function ReportTableList({
  data,
  monthsCount,
  mode,
  groupBy,
  renderItem,
}: ReportTableListProps) {
  const groupByItem = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';

  type RenderRowProps = {
    key: string;
    index: number;
    parent_index?: number;
    style?: CSSProperties;
  };
  function RenderRow({ index, parent_index, style, key }: RenderRowProps) {
    let item;
    if (parent_index != null) {
      item = data[parent_index].categories[index];
    } else {
      item = data[index];
    }

    const rendered_row = renderItem({
      item,
      groupByItem,
      mode,
      style,
      key,
      monthsCount,
    });

    return rendered_row;
  }

  return (
    <View>
      {data.map((item, index) => {
        return (
          <View key={item.id}>
            {data ? (
              <>
                <RenderRow
                  key={item.id}
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
                            key={category.id}
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
