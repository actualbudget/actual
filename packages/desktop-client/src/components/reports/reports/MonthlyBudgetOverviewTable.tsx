import { Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AutomationOverview,
  AutomationOverviewAmounts,
} from '@actual-app/core/types/models';

import { MonthlyBudgetOverviewAmountCell } from '#components/reports/reports/MonthlyBudgetOverviewAmountCell';

const COLUMN_WIDTH = 120;

type MonthlyBudgetOverviewTableProps = {
  data: AutomationOverview;
};

function AmountColumns({
  amounts,
  monthCount,
  emphasize = false,
  highlightRemaining = false,
}: {
  amounts: AutomationOverviewAmounts;
  monthCount: number;
  emphasize?: boolean;
  highlightRemaining?: boolean;
}) {
  const showAverage = monthCount > 1;

  return (
    <>
      <View style={{ width: COLUMN_WIDTH, alignItems: 'flex-end' }}>
        <MonthlyBudgetOverviewAmountCell
          amount={amounts.carriedOver}
          average={amounts.averageCarriedOver}
          showAverage={showAverage}
          emphasize={emphasize}
        />
      </View>
      <View style={{ width: COLUMN_WIDTH, alignItems: 'flex-end' }}>
        <MonthlyBudgetOverviewAmountCell
          amount={amounts.needed}
          average={amounts.averageNeeded}
          showAverage={showAverage}
          emphasize={emphasize}
        />
      </View>
      <View style={{ width: COLUMN_WIDTH, alignItems: 'flex-end' }}>
        <MonthlyBudgetOverviewAmountCell
          amount={amounts.budgeted}
          average={amounts.averageBudgeted}
          showAverage={showAverage}
          emphasize={emphasize}
        />
      </View>
      <View style={{ width: COLUMN_WIDTH, alignItems: 'flex-end' }}>
        <MonthlyBudgetOverviewAmountCell
          amount={amounts.remaining}
          average={amounts.averageRemaining}
          showAverage={showAverage}
          emphasize={emphasize}
          errorColor={
            highlightRemaining && amounts.remaining > 0
              ? theme.errorText
              : undefined
          }
        />
      </View>
    </>
  );
}

export function MonthlyBudgetOverviewTable({
  data,
}: MonthlyBudgetOverviewTableProps) {
  const headerStyle = {
    borderBottom: `1px solid ${theme.tableBorder}`,
    paddingBottom: 8,
    color: theme.pageTextSubdued,
    fontWeight: 600,
  } as const;

  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingBlock: 4,
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ ...rowStyle, ...headerStyle }}>
        <Block style={{ flex: 1 }}>
          <Trans>Category</Trans>
        </Block>
        <Block style={{ width: COLUMN_WIDTH, textAlign: 'right' }}>
          <Trans>Carried over</Trans>
        </Block>
        <Block style={{ width: COLUMN_WIDTH, textAlign: 'right' }}>
          <Trans>Needed</Trans>
        </Block>
        <Block style={{ width: COLUMN_WIDTH, textAlign: 'right' }}>
          <Trans>Budgeted</Trans>
        </Block>
        <Block style={{ width: COLUMN_WIDTH, textAlign: 'right' }}>
          <Trans>Still needed</Trans>
        </Block>
      </View>

      {data.groups.map(group => (
        <View key={group.groupId} style={{ gap: 4 }}>
          <View
            style={{
              ...rowStyle,
              ...headerStyle,
              marginTop: 8,
            }}
          >
            <Block style={{ flex: 1, fontWeight: 600 }}>
              {group.groupName}
            </Block>
            <AmountColumns
              amounts={group.subtotal}
              monthCount={data.monthCount}
              emphasize
            />
          </View>
          {group.categories.map(category => (
            <View key={category.categoryId} style={rowStyle}>
              <Block style={{ flex: 1, paddingLeft: 16 }}>
                {category.categoryName}
              </Block>
              <AmountColumns
                amounts={category}
                monthCount={data.monthCount}
                highlightRemaining
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
