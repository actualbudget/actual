import React, { useState, useMemo } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { amountToCurrency } from 'loot-core/src/shared/util';

import { useCategories } from '../../../hooks/useCategories';
import { styles } from '../../../style/styles';
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
  const categories = useCategories();

  const [isCardHovered, setIsCardHovered] = useState(false);

  const getGraphData = useMemo(() => {
    return createSpendingSpreadsheet({
      categories,
    });
  }, [categories]);

  const data = useReport('default', getGraphData);
  const difference =
    data &&
    data.intervalData[monthUtils.getDay(monthUtils.currentDay()) - 1].average -
      data.intervalData[monthUtils.getDay(monthUtils.currentDay()) - 1]
        .thisMonth;

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
          {data && (
            <View style={{ textAlign: 'right' }}>
              <Block
                style={{
                  ...styles.mediumText,
                  fontWeight: 500,
                  marginBottom: 5,
                }}
              >
                <PrivacyFilter activationFilters={[!isCardHovered]}>
                  {data && amountToCurrency(difference)}
                </PrivacyFilter>
              </Block>
            </View>
          )}
        </View>

        {data ? (
          <SpendingGraph
            style={{ flexGrow: 1 }}
            compact={true}
            data={data}
            mode="average"
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
