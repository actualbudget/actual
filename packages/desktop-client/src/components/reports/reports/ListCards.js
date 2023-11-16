import React from 'react';

import { useReports } from 'loot-core/src/client/data-hooks/reports';

import { styles } from '../../../style';
import Block from '../../common/Block';
import View from '../../common/View';
import DateRange from '../DateRange';
import BarGraph from '../graphs/BarGraph';
import { LoadingIndicator } from '../Overview';
import ReportCard from '../ReportCard';
import { ReportOptions } from '../ReportOptions';

export default function CustomReportsCardList() {
  let reports = useReports();
  //const splitData = ['Month', 'Year'].includes(groupBy) ? 'monthData' : 'data';

  return (
    <View
      style={{
        flex: '0 0 auto',
        flexDirection: 'row',
      }}
    >
      {reports.length > 0 &&
        reports.map(report => (
          <ReportCard
            flex={1}
            to="/reports/custom"
            key={report.id}
            report={report}
          >
            {!report.start ? (
              <View>Error</View>
            ) : (
              <>
                <View>
                  <View
                    style={{ flexDirection: 'row', padding: '20px 20px 0' }}
                  >
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

                {report.data ? (
                  <BarGraph
                    start={report.start}
                    end={report.end}
                    data={report.data}
                    compact={true}
                    groupBy={report.groupBy}
                    empty={report.empty === 1 ? true : false}
                    balanceTypeOp={ReportOptions.balanceTypeMap.get(
                      report.balanceType,
                    )}
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
