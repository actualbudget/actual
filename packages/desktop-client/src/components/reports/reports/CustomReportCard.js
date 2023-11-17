import React, { useMemo } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import useCategories from '../../../hooks/useCategories';
import { styles } from '../../../style';
import Block from '../../common/Block';
import View from '../../common/View';
import DateRange from '../DateRange';
import BarGraph from '../graphs/BarGraph';
import { LoadingIndicator } from '../Overview';
import ReportCard from '../ReportCard';
import defaultSpreadsheet from '../spreadsheets/default-spreadsheet';
import useReport from '../useReport';

function CustomReportCard() {
  const categories = useCategories();

  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, 3);
  const groupBy = 'Category';

  const getGraphData = useMemo(() => {
    return defaultSpreadsheet(start, end, groupBy, 'totalDebts', categories);
  }, [start, end, categories]);
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
            <DateRange start={start} end={end} />
          </View>
        </View>
      </View>

      {data ? (
        <BarGraph
          start={start}
          end={end}
          data={data}
          compact={true}
          groupBy={groupBy}
          empty={true}
          balanceTypeOp={'totalDebts'}
          style={{ height: 'auto', flex: 1 }}
        />
      ) : (
        <LoadingIndicator />
      )}
    </ReportCard>
  );
}

export default CustomReportCard;
