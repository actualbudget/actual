import React, { useState, useMemo } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';

import { useLocalPref } from '../../../hooks/useLocalPref';
import { styles } from '../../../style/styles';
import { theme } from '../../../style/theme';
import { Block } from '../../common/Block';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { DateRange } from '../DateRange';
import { SpendingGraph } from '../graphs/SpendingGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { createSpendingSpreadsheet } from '../spreadsheets/spending-spreadsheet';
import { useReport } from '../useReport';

export function SpendingCard() {
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [spendingReportFilter = ''] = useLocalPref('spendingReportFilter');
  const [spendingReportTime = 'lastMonth'] = useLocalPref('spendingReportTime');
  const [spendingReportCompare = 'thisMonth'] = useLocalPref(
    'spendingReportCompare',
  );

  const parseFilter = spendingReportFilter && JSON.parse(spendingReportFilter);
  const getGraphData = useMemo(() => {
    return createSpendingSpreadsheet({
      conditions: parseFilter.conditions,
      conditionsOp: parseFilter.conditionsOp,
      compare: spendingReportCompare,
    });
  }, [parseFilter, spendingReportCompare]);

  const data = useReport('default', getGraphData);
  const todayDay =
    spendingReportCompare === 'lastMonth'
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
        ? 27
        : monthUtils.getDay(monthUtils.currentDay()) - 1;
  const difference =
    data &&
    data.intervalData[todayDay][spendingReportTime] -
      data.intervalData[todayDay][spendingReportCompare];
  const showLastMonth = data && Math.abs(data.intervalData[27].lastMonth) > 0;

  return (
    <ReportCard to="/reports/spending">
      <View
        style={{ flex: 1 }}
        onPointerEnter={() => setIsCardHovered(true)}
        onPointerLeave={() => setIsCardHovered(false)}
      >
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <Block
              style={{ ...styles.mediumText, fontWeight: 500, marginBottom: 5 }}
              role="heading"
            >
              Monthly Spending
            </Block>
            <DateRange
              start={monthUtils.currentMonth()}
              end={monthUtils.currentMonth()}
            />
          </View>
          {data && showLastMonth && (
            <View style={{ textAlign: 'right' }}>
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                  color: !difference
                    ? 'inherit'
                    : difference <= 0
                      ? theme.noticeTextLight
                      : theme.errorText,
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  {data &&
                    (difference && difference > 0 ? '+' : '') +
                      amountToCurrency(difference)}
                </PrivacyFilter>
              </Block>
            </View>
          )}
        </View>
        {!showLastMonth ? (
          <View style={{ padding: 5 }}>
            <p style={{ margin: 0, textAlign: 'center' }}>
              Additional data required to generate graph
            </p>
          </View>
        ) : data ? (
          <SpendingGraph
            style={{ flex: 1 }}
            compact={true}
            data={data}
            mode={spendingReportTime}
            compare={spendingReportCompare}
          />
        ) : (
          <LoadingIndicator message="Loading report..." />
        )}
      </View>
    </ReportCard>
  );
}
