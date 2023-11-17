import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { styles } from '../../../style';
import { type CSSProperties } from '../../../style';
import View from '../../common/View';
import { ReportOptions } from '../ReportOptions';
import ReportTable from '../ReportTable';
import ReportTableHeader from '../ReportTableHeader';
import ReportTableList from '../ReportTableList';
import ReportTableTotals from '../ReportTableTotals';

type TableGraphProps = {
  mode;
  start;
  end;
  scrollWidth?;
  saveScrollWidth?;
  balanceType;
  style?: CSSProperties;
  data;
  groupBy;
  empty;
  compact: boolean;
};

function TableGraph({
  mode,
  start,
  end,
  scrollWidth,
  saveScrollWidth,
  balanceType,
  style,
  data,
  groupBy,
  empty,
  compact,
}: TableGraphProps) {
  const months = monthUtils.rangeInclusive(start, end);

  return (
    <View
      style={{
        overflow: compact ? 'hidden' : 'auto',
      }}
    >
      <ReportTableHeader
        interval={mode === 'time' && months}
        scrollWidth={scrollWidth}
        groupBy={groupBy}
        balanceType={balanceType}
        style={compact && { flex: '0 0 20px', height: 20 }}
        cellStyle={compact && { ...styles.tinyText }}
        compact={compact}
      />
      <ReportTable saveScrollWidth={saveScrollWidth}>
        <ReportTableList
          data={data}
          empty={empty}
          monthsCount={months.length}
          balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
          mode={mode}
          groupBy={groupBy}
          compact={compact}
        />
        <ReportTableTotals
          scrollWidth={scrollWidth}
          data={data}
          mode={mode}
          balanceTypeOp={ReportOptions.balanceTypeMap.get(balanceType)}
          monthsCount={months.length}
          style={compact && { flex: '0 0 20px', height: 20 }}
          cellStyle={compact && { ...styles.tinyText }}
          compact={compact}
        />
      </ReportTable>
    </View>
  );
}

export default TableGraph;
