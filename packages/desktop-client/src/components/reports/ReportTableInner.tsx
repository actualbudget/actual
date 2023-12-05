import React from 'react';

import { type CSSProperties, theme } from '../../style';
import View from '../common/View';
import { Row } from '../table';

import { type GroupedEntity } from './entities';

type ReportTableInnerProps = {
  data: GroupedEntity[];
  balanceTypeOp?: string;
  mode: string;
  monthsCount: number;
  showEmpty: boolean;
  groupBy: string;
  renderItem;
};

function ReportTableInner({
  data,
  showEmpty,
  monthsCount,
  balanceTypeOp,
  mode,
  groupBy,
  renderItem,
}: ReportTableInnerProps) {
  const groupByItem = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';

  type RenderRowProps = {
    key: string;
    row;
    index: number;
    parent_index?: number;
    style?: CSSProperties;
  };
  function RenderRow({ row, index, parent_index, style, key }: RenderRowProps) {
    let item;
    if (row.categories) {
      item = data[index];
    } else {
      item = data[parent_index].categories[index];
    }

    let rendered_row = renderItem({
      item,
      groupByItem,
      mode,
      monthsCount,
      style,
      key,
    });

    return rendered_row;
  }

  return (
    <View>
      {data.map((item, index) => {
        return (
          <>
            <RenderRow
              key={item.id}
              row={item}
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
                  {item.categories
                    .filter(i =>
                      !showEmpty
                        ? balanceTypeOp === 'totalTotals'
                          ? i.totalAssets !== 0 ||
                            i.totalDebts !== 0 ||
                            i.totalTotals !== 0
                          : i[balanceTypeOp] !== 0
                        : true,
                    )
                    .map((category, i) => {
                      return (
                        <RenderRow
                          key={category.id}
                          row={category}
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
        );
      })}
    </View>
  );
}

export default ReportTableInner;
