import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { AutomationOverview } from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

type MonthlyBudgetOverviewSummaryProps = {
  data: AutomationOverview;
  compact?: boolean;
};

export function MonthlyBudgetOverviewSummary({
  data,
  compact = false,
}: MonthlyBudgetOverviewSummaryProps) {
  const format = useFormat();
  const locale = useLocale();
  const showAverageNeeded = data.monthCount > 1;
  const { totals: amounts } = data;

  const renderAmount = (
    value: number,
    options?: { emphasize?: boolean; errorColor?: string },
  ) => (
    <FinancialText
      style={{
        fontWeight: options?.emphasize ? 600 : undefined,
        color: options?.errorColor,
      }}
    >
      <PrivacyFilter>{format(value, 'financial')}</PrivacyFilter>
    </FinancialText>
  );

  if (compact) {
    return (
      <View style={{ gap: 8 }}>
        <AlignedText
          style={{ minWidth: 180 }}
          left={
            <Block>
              <Trans>Total needed</Trans>
            </Block>
          }
          right={renderAmount(amounts.needed, { emphasize: true })}
        />
        <AlignedText
          style={{ minWidth: 180 }}
          left={
            <Block>
              <Trans>Still needed</Trans>
            </Block>
          }
          right={renderAmount(amounts.remaining, {
            emphasize: true,
            errorColor:
              amounts.remaining > 0 ? theme.errorText : theme.noticeTextLight,
          })}
        />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'column', marginBottom: 10 }}>
      <View
        style={{
          backgroundColor: theme.pageBackground,
          padding: 15,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            ...styles.largeText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 600,
          }}
        >
          {monthUtils.format(data.startMonth, 'MMMM yyyy', locale)}
          {data.startMonth !== data.endMonth &&
            ` – ${monthUtils.format(data.endMonth, 'MMMM yyyy', locale)}`}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: theme.pageBackground,
          padding: 15,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 10,
        }}
      >
        <Text
          style={{
            ...styles.mediumText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 400,
          }}
        >
          <Trans>TOTAL NEEDED</Trans>
        </Text>
        <FinancialText
          style={{
            ...styles.veryLargeText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 800,
          }}
        >
          <PrivacyFilter>{format(amounts.needed, 'financial')}</PrivacyFilter>
        </FinancialText>
        <Text style={{ fontWeight: 600 }}>
          <Trans>For this time period</Trans>
        </Text>
      </View>
      {showAverageNeeded && amounts.averageNeeded != null && (
        <View
          style={{
            backgroundColor: theme.pageBackground,
            padding: 15,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <Text
            style={{
              ...styles.mediumText,
              alignItems: 'center',
              marginBottom: 2,
              fontWeight: 400,
            }}
          >
            <Trans>AVERAGE NEEDED</Trans>
          </Text>
          <FinancialText
            style={{
              ...styles.veryLargeText,
              alignItems: 'center',
              marginBottom: 2,
              fontWeight: 800,
            }}
          >
            <PrivacyFilter>
              {format(amounts.averageNeeded, 'financial')}
            </PrivacyFilter>
          </FinancialText>
          <Text style={{ fontWeight: 600 }}>
            <Trans>Per month</Trans>
          </Text>
        </View>
      )}
      <View
        style={{
          backgroundColor: theme.pageBackground,
          padding: 15,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 10,
        }}
      >
        <Text
          style={{
            ...styles.mediumText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 400,
          }}
        >
          <Trans>STILL NEEDED</Trans>
        </Text>
        <FinancialText
          style={{
            ...styles.veryLargeText,
            alignItems: 'center',
            marginBottom: 2,
            fontWeight: 800,
            color:
              amounts.remaining > 0 ? theme.errorText : theme.noticeTextLight,
          }}
        >
          <PrivacyFilter>
            {format(amounts.remaining, 'financial')}
          </PrivacyFilter>
        </FinancialText>
        <Text style={{ fontWeight: 600 }}>
          <Trans>For this time period</Trans>
        </Text>
      </View>
      <View style={{ gap: 12, marginTop: 16 }}>
        <AlignedText
          left={
            <Block>
              <Trans>Total carried over</Trans>
            </Block>
          }
          right={renderAmount(amounts.carriedOver, { emphasize: true })}
        />
        <AlignedText
          left={
            <Block>
              <Trans>Total budgeted</Trans>
            </Block>
          }
          right={renderAmount(amounts.budgeted, { emphasize: true })}
        />
      </View>
    </View>
  );
}
