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

  return (
    <View style={{ gap: compact ? 8 : 12 }}>
      <AlignedText
        style={{ minWidth: compact ? 180 : 240 }}
        left={
          <Block>
            <Trans>Total needed</Trans>
          </Block>
        }
        right={
          <FinancialText style={{ fontWeight: 600 }}>
            <PrivacyFilter>
              {format(data.totalNeeded, 'financial')}
            </PrivacyFilter>
          </FinancialText>
        }
      />
      <AlignedText
        style={{ minWidth: compact ? 180 : 240 }}
        left={
          <Block>
            <Trans>Total budgeted</Trans>
          </Block>
        }
        right={
          <FinancialText style={{ fontWeight: 600 }}>
            <PrivacyFilter>
              {format(data.totalBudgeted, 'financial')}
            </PrivacyFilter>
          </FinancialText>
        }
      />
      <AlignedText
        style={{ minWidth: compact ? 180 : 240 }}
        left={
          <Block>
            <Trans>Still needed</Trans>
          </Block>
        }
        right={
          <FinancialText
            style={{
              fontWeight: 600,
              color:
                data.remaining > 0
                  ? theme.errorText
                  : theme.noticeTextLight,
            }}
          >
            <PrivacyFilter>
              {format(data.remaining, 'financial')}
            </PrivacyFilter>
          </FinancialText>
        }
      />
    </View>
  );
}
