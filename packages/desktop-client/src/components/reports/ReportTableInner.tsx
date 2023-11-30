import React from 'react';

import { theme } from '../../style';
import View from '../common/View';
import { Row } from '../table';

import { type GroupedEntity } from './entities';
import ReportTableRow from './ReportTableRow';

type ReportTableInnerProps = {
  data: GroupedEntity[];
  balanceTypeOp?: string;
  mode: string;
  monthsCount: number;
  showEmpty: boolean;
  groupBy: string;
};

function ReportTableInner({
  data,
  showEmpty,
  monthsCount,
  balanceTypeOp,
  mode,
  groupBy,
}: ReportTableInnerProps) {
  const groupByItem = ['Month', 'Year'].includes(groupBy) ? 'date' : 'name';

  return (
    <View>
      {data.map(item => {
        return (
          <>
            <ReportTableRow
              key={item.id}
              item={item}
              balanceTypeOp={balanceTypeOp}
              groupByItem={groupByItem}
              mode={mode}
              monthsCount={monthsCount}
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
                    .map(cat => {
                      return (
                        <ReportTableRow
                          key={cat.id}
                          item={cat}
                          balanceTypeOp={balanceTypeOp}
                          groupByItem={groupByItem}
                          mode={mode}
                          monthsCount={monthsCount}
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
