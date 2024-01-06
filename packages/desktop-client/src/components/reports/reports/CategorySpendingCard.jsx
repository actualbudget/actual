import React, { useMemo } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { useCategories } from '../../../hooks/useCategories';
import { styles } from '../../../style';
import { Block } from '../../common/Block';
import { View } from '../../common/View';
import { DateRange } from '../DateRange';
import { CategorySpendingGraph } from '../graphs/CategorySpendingGraph';
import { LoadingIndicator } from '../LoadingIndicator';
import { ReportCard } from '../ReportCard';
import { createSpreadsheet as categorySpendingSpreadsheet } from '../spreadsheets/category-spending-spreadsheet';
import { useReport } from '../useReport';

export function CategorySpendingCard() {
  const { list: categories = [] } = useCategories();

  const end = monthUtils.currentDay();
  const start = monthUtils.subMonths(end, 3);

  const params = useMemo(() => {
    return categorySpendingSpreadsheet(
      start,
      end,
      3,
      categories.filter(category => !category.is_income && !category.hidden),
    );
  }, [start, end, categories]);

  const perCategorySpending = useReport('category_spending', params);

  return (
    <ReportCard flex={1} to="/reports/category-spending">
      <View>
        <View style={{ flexDirection: 'row', padding: '20px 20px 0' }}>
          <View style={{ flex: 1 }}>
            <Block
              style={{ ...styles.mediumText, fontWeight: 500, marginBottom: 5 }}
              role="heading"
            >
              Spending
            </Block>
            <DateRange start={start} end={end} />
          </View>
        </View>
      </View>

      {perCategorySpending ? (
        <CategorySpendingGraph
          start={start}
          end={end}
          graphData={perCategorySpending}
          compact={true}
        />
      ) : (
        <LoadingIndicator />
      )}
    </ReportCard>
  );
}
