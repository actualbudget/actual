import React, { useMemo } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { useCategories } from '../../../hooks/useCategories';
import { styles } from '../../../style';
import { Block } from '../../common/Block';
import { View } from '../../common/View';
import { DateRange } from '../DateRange';
import { BarGraph } from '../graphs/BarGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { createSpreadsheet as defaultSpreadsheet } from '../spreadsheets/default-spreadsheet';
import { useReport } from '../useReport';

export function CustomReportCard() {
  const categories = useCategories();

  const endDate = monthUtils.currentMonth();
  const startDate = monthUtils.subMonths(endDate, 3);
  const groupBy = 'Category';

  const getGraphData = useMemo(() => {
    return defaultSpreadsheet({
      startDate,
      endDate,
      groupBy,
      balanceTypeOp: 'totalDebts',
      categories,
    });
  }, [startDate, endDate, categories]);
  const data = useReport('default', getGraphData);

  return (
    <ReportCard flex={1} to="/reports/custom">
      <View>
        <View style={{ flexDirection: 'row', padding: '20px 20px 0' }}>
          <View style={{ flex: 1 }}>
            <Block
              style={{ ...styles.mediumText, fontWeight: 500, marginBottom: 5 }}
              role="heading"
            >
              Custom Report
            </Block>
            <DateRange start={startDate} end={endDate} />
          </View>
        </View>
      </View>

      {data ? (
        <BarGraph
          data={data}
          compact={true}
          groupBy={groupBy}
          balanceTypeOp="totalDebts"
          style={{ height: 'auto', flex: 1 }}
        />
      ) : (
        <LoadingIndicator />
      )}
    </ReportCard>
  );
}
