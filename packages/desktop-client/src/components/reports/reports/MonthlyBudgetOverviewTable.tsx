import { Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  AutomationOverview,
  AutomationOverviewAmounts,
} from '@actual-app/core/types/models';

import { MonthlyBudgetOverviewAmountCell } from './MonthlyBudgetOverviewAmountCell';
import {
  getFundingStatusAmount,
  getFundingStatusColor,
} from './monthlyBudgetOverviewFundingStatus';

const COLUMN_WIDTH = 120;

type MonthlyBudgetOverviewTableProps = {
  data: AutomationOverview;
};

function FundingStatusCell({
  amounts,
  emphasize = false,
  highlight = false,
}: {
  amounts: AutomationOverviewAmounts;
  emphasize?: boolean;
  highlight?: boolean;
}) {
  const amount = getFundingStatusAmount(amounts);
  const color = highlight ? getFundingStatusColor(amount) : undefined;

  return (
    <View style={{ width: COLUMN_WIDTH, alignItems: 'flex-end' }}>
      <MonthlyBudgetOverviewAmountCell amount={amount} emphasize={emphasize} color={color} />
    </View>
  );
}

function AmountColumns({
  amounts,
  emphasize = false,
  highlightFundingStatus = false,
}: {
  amounts: AutomationOverviewAmounts;
  emphasize?: boolean;
  highlightFundingStatus?: boolean;
}) {
  return (
    <>
      <View style={{ width: COLUMN_WIDTH, alignItems: 'flex-end' }}>
        <MonthlyBudgetOverviewAmountCell amount={amounts.carriedOver} emphasize={emphasize} />
      </View>
      <View style={{ width: COLUMN_WIDTH, alignItems: 'flex-end' }}>
        <MonthlyBudgetOverviewAmountCell amount={amounts.needed} emphasize={emphasize} />
      </View>
      <View style={{ width: COLUMN_WIDTH, alignItems: 'flex-end' }}>
        <MonthlyBudgetOverviewAmountCell amount={amounts.budgeted} emphasize={emphasize} />
      </View>
      <FundingStatusCell
        amounts={amounts}
        emphasize={emphasize}
        highlight={highlightFundingStatus}
      />
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
          <Trans>Projected</Trans>
        </Block>
        <Block style={{ width: COLUMN_WIDTH, textAlign: 'right' }}>
          <Trans>Budgeted</Trans>
        </Block>
        <Block style={{ width: COLUMN_WIDTH, textAlign: 'right' }}>
          <Trans>Funding status</Trans>
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
              emphasize
              highlightFundingStatus
            />
          </View>
          {group.categories.map(category => (
            <View key={category.categoryId} style={rowStyle}>
              <Block style={{ flex: 1, paddingLeft: 16 }}>
                {category.categoryName}
              </Block>
              <AmountColumns amounts={category} highlightFundingStatus />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
