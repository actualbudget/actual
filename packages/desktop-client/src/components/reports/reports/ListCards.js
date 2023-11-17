import React, { Children } from 'react';

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

  const ReportGrid = slice => {
    const pack = [];

    slice?.map((item, i) => {
      pack.push(<Children data={item} />);
      return null;
    });

    const data2 = [...pack];
    const remainder = 3 - (data2.length % 3);
    const groupedData = [];

    while (data2.length) {
      groupedData.push(data2.splice(0, 3));
    }

    return (
      <>
        {groupedData.map((data, i) => (
          <View
            key={i}
            style={{
              flex: '0 0 auto',
              flexDirection: 'row',
            }}
          >
            {data.map((report, id) => (
              <ReportCard
                flex={1}
                to="/reports/custom"
                key={id}
                report={report.props.data}
              >
                {!report.props.data.start ? (
                  <View>Error</View>
                ) : (
                  <>
                    <View style={{ flex: 1, padding: 20 }}>
                      <Block
                        style={{
                          ...styles.mediumText,
                          fontWeight: 500,
                          marginBottom: 5,
                        }}
                        role="heading"
                      >
                        {report.props.data.name}
                      </Block>
                      <DateRange
                        start={report.props.data.start}
                        end={report.props.data.end}
                      />
                    </View>

                    {report.props.data.data ? (
                      <BarGraph
                        start={report.props.data.start}
                        end={report.props.data.end}
                        data={report.props.data.data}
                        compact={true}
                        groupBy={report.props.data.groupBy}
                        empty={report.props.data.empty === 1 ? true : false}
                        balanceTypeOp={ReportOptions.balanceTypeMap.get(
                          report.props.data.balanceType,
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
            {remainder !== 3 &&
              i + 1 === groupedData.length &&
              [...Array(remainder)].map((e, i) => (
                <View key={i} style={{ padding: 15, flex: 1 }} />
              ))}
          </View>
        ))}
      </>
    );
  };

  return reports.length > 0 && ReportGrid(reports);
}
