import React, { useState, useMemo, useCallback } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { styles } from '../../../style';
import { Block } from '../../common/Block';
import { View } from '../../common/View';
import { PrivacyFilter } from '../../PrivacyFilter';
import { Change } from '../Change';
import { DateRange } from '../DateRange';
import { NetWorthGraph } from '../graphs/NetWorthGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { createSpreadsheet as netWorthSpreadsheet } from '../spreadsheets/net-worth-spreadsheet';
import { useReport } from '../useReport';

export function NetWorthCard({ isEditing, accounts, onRemove }) {
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, 5);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const onCardHover = useCallback(() => setIsCardHovered(true));
  const onCardHoverEnd = useCallback(() => setIsCardHovered(false));

  const params = useMemo(
    () => netWorthSpreadsheet(start, end, accounts),
    [start, end, accounts],
  );
  const data = useReport('net_worth', params);

  return (
    <ReportCard
      isEditing={isEditing}
      to="/reports/net-worth"
      menuItems={[
        {
          name: 'remove',
          text: 'Remove',
        },
      ]}
      onMenuSelect={item => {
        switch (item) {
          case 'remove':
            onRemove();
            break;
          default:
            throw new Error(`Unrecognized selection: ${item}`);
        }
      }}
    >
      <View
        style={{ flex: 1 }}
        onPointerEnter={onCardHover}
        onPointerLeave={onCardHoverEnd}
      >
        <View style={{ flexDirection: 'row', padding: 20 }}>
          <View style={{ flex: 1 }}>
            <Block
              style={{ ...styles.mediumText, fontWeight: 500, marginBottom: 5 }}
              role="heading"
            >
              Net Worth
            </Block>
            <DateRange start={start} end={end} />
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
                  {integerToCurrency(data.netWorth)}
                </PrivacyFilter>
              </Block>
              <PrivacyFilter activationFilters={[!isCardHovered]}>
                <Change amount={data.totalChange} />
              </PrivacyFilter>
            </View>
          )}
        </View>

        {data ? (
          <NetWorthGraph
            start={start}
            end={end}
            graphData={data.graphData}
            compact={true}
            style={{ height: 'auto', flex: 1 }}
          />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
