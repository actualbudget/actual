import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AutomationOverview } from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

type MonthlyBudgetOverviewSummaryProps = {
  data: AutomationOverview;
  compact?: boolean;
};

export function MonthlyBudgetOverviewSummary({
  data,
  compact = false,
}: MonthlyBudgetOverviewSummaryProps) {
  const format = useFormat();
  const showAverage = data.monthCount > 1;
  const { totals: amounts } = data;

  const renderAmount = (
    value: number,
    average: number | undefined,
    options?: { emphasize?: boolean; errorColor?: string },
  ) => (
    <View style={{ alignItems: 'flex-end' }}>
      <FinancialText
        style={{
          fontWeight: options?.emphasize ? 600 : undefined,
          color: options?.errorColor,
        }}
      >
        <PrivacyFilter>{format(value, 'financial')}</PrivacyFilter>
      </FinancialText>
      {showAverage && average != null && (
        <FinancialText style={{ fontSize: 12, opacity: 0.85 }}>
          <PrivacyFilter>
            {format(average, 'financial')} <Trans>avg</Trans>
          </PrivacyFilter>
        </FinancialText>
      )}
    </View>
  );

  return (
    <View style={{ gap: compact ? 8 : 12 }}>
      <AlignedText
        style={{ minWidth: compact ? 180 : 240 }}
        left={
          <Block>
            <Trans>Total carried over</Trans>
          </Block>
        }
        right={renderAmount(amounts.carriedOver, amounts.averageCarriedOver, {
          emphasize: true,
        })}
      />
      <AlignedText
        style={{ minWidth: compact ? 180 : 240 }}
        left={
          <Block>
            <Trans>Total needed</Trans>
          </Block>
        }
        right={renderAmount(amounts.needed, amounts.averageNeeded, {
          emphasize: true,
        })}
      />
      <AlignedText
        style={{ minWidth: compact ? 180 : 240 }}
        left={
          <Block>
            <Trans>Total budgeted</Trans>
          </Block>
        }
        right={renderAmount(amounts.budgeted, amounts.averageBudgeted, {
          emphasize: true,
        })}
      />
      <AlignedText
        style={{ minWidth: compact ? 180 : 240 }}
        left={
          <Block>
            <Trans>Still needed</Trans>
          </Block>
        }
        right={renderAmount(amounts.remaining, amounts.averageRemaining, {
          emphasize: true,
          errorColor:
            amounts.remaining > 0 ? theme.errorText : theme.noticeTextLight,
        })}
      />
    </View>
  );
}
