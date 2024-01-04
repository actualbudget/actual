import React, { useMemo } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { useCategories } from '../../../hooks/useCategories';
import { styles } from '../../../style';
import { Block } from '../../common/Block';
import { View } from '../../common/View';
import { DateRange } from '../DateRange';
import { SankeyGraph } from '../graphs/SankeyGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { createSpreadsheet as sankeySpreadsheet } from '../spreadsheets/sankey-spreadsheet';
import { useReport } from '../useReport';

export function SankeyCard() {
  const { grouped: categoryGroups } = useCategories();
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, 5);

  const params = useMemo(
    () => sankeySpreadsheet(start, end, categoryGroups),
    [start, end, categoryGroups],
  );
  const data = useReport('sankey', params);

  return (
    <ReportCard flex={1} to="/reports/sankey">
      <View style={{ flexDirection: 'row', padding: 20 }}>
        <View style={{ flex: 1 }}>
          <Block
            style={{ ...styles.mediumText, fontWeight: 500, marginBottom: 5 }}
            role="heading"
          >
            Sankey
          </Block>
          <DateRange start={start} end={end} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {data ? (
          <SankeyGraph data={data} compact={true} />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </ReportCard>
  );
}
