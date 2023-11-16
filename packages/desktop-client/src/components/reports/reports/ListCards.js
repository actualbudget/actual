import React, { useMemo } from 'react';

import { useReports } from 'loot-core/src/client/data-hooks/reports';
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

export default function CustomReportsCardList() {
  let reports = useReports();
  const categories = useCategories();
  let firstMonth = monthUtils.subMonths(monthUtils.currentMonth(), 12);
  const currentMonth = monthUtils.currentMonth();

  const getGraphData = useMemo(() => {
    return defaultSpreadsheet(
      firstMonth,
      currentMonth,
      'Category',
      'totalDebts',
      categories,
    );
  }, [firstMonth, currentMonth, categories]);
  const data = useReport('defaultList', getGraphData);

  return (
    <View
      style={{
        flex: '0 0 auto',
        flexDirection: 'row',
      }}
    >
      {reports.map(report => (
        <ReportCard
          flex={1}
          to="/reports/custom-report"
          key={report.id}
          report={report}
        >
          {!report.start ? (
            <View>Error</View>
          ) : (
            <>
              <View>
                <View style={{ flexDirection: 'row', padding: '20px 20px 0' }}>
                  <View style={{ flex: 1 }}>
                    <Block
                      style={{
                        ...styles.mediumText,
                        fontWeight: 500,
                        marginBottom: 5,
                      }}
                      role="heading"
                    >
                      {report.name}
                    </Block>
                    <DateRange start={report.start} end={report.end} />
                  </View>
                </View>
              </View>

              {data ? (
                <BarGraph
                  start={report.start}
                  end={report.end}
                  data={data}
                  compact={true}
                  groupBy={'Category'}
                  empty={true}
                  balanceTypeOp={'totalDebts'}
                  style={{ height: 'auto', flex: 1 }}
                />
              ) : (
                <LoadingIndicator />
              )}
            </>
          )}
        </ReportCard>
      ))}
    </View>
  );
}
