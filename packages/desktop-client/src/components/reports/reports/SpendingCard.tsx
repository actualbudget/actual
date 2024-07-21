import React, { useState, useMemo } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';

import { useCategories } from '../../../hooks/useCategories';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { styles } from '../../../style/styles';
import { theme } from '../../../style/theme';
import { Block } from '../../common/Block';
import { View } from '../../common/View';
import { type SavedFilter } from '../../filters/SavedFilterMenuButton';
import { PrivacyFilter } from '../../PrivacyFilter';
import { DateRange } from '../DateRange';
import { SpendingGraph } from '../graphs/SpendingGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { createSpendingSpreadsheet } from '../spreadsheets/spending-spreadsheet';
import { useReport } from '../useReport';

export function SpendingCard() {
  const categories = useCategories();

  const [isCardHovered, setIsCardHovered] = useState(false);
  const defaultFilter: SavedFilter = { name: 'spendingReport' };
  const [spendingReportFilter = defaultFilter] = useLocalPref(
    'spendingReportFilter',
  );

  const getGraphData = useMemo(() => {
    return createSpendingSpreadsheet({
      categories,
      conditions: spendingReportFilter.conditions,
      conditionsOp: spendingReportFilter.conditionsOp,
    });
  }, [categories, spendingReportFilter]);

  const data = useReport('default', getGraphData);
  const todayDay =
    monthUtils.getDay(monthUtils.currentDay()) - 1 >= 28
      ? 27
      : monthUtils.getDay(monthUtils.currentDay()) - 1;
  const difference =
    data &&
    data.intervalData[todayDay].lastMonth -
      data.intervalData[todayDay].thisMonth;
  const showLastMonth = data && Math.abs(data.intervalData[27].lastMonth) > 0;

  return (
    <ReportCard flex="1" to="/reports/spending">
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
            mode="lastMonth"
          />
        ) : (
          <LoadingIndicator message="Loading report..." />
        )}
      </View>
    </ReportCard>
  );
}
