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

import { MonthlyBudgetOverviewAmountCell } from './MonthlyBudgetOverviewAmountCell';

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
  const { totals: amounts } = data;

  const sectionPadding = compact ? 10 : 15;
  const sectionGap = compact ? 6 : 10;
  const headerTextStyle = compact
    ? { fontSize: 16, fontWeight: 600, letterSpacing: 0.5 }
    : styles.largeText;
  const labelTextStyle = compact
    ? { fontSize: 13, fontWeight: 400 }
    : styles.mediumText;
  const valueTextStyle = compact
    ? { fontSize: 22, fontWeight: 800 }
    : styles.veryLargeText;
  const subtitleTextStyle = compact
    ? { fontSize: 13, fontWeight: 600 }
    : { ...styles.mediumText, fontWeight: 600 };

  const summarySectionStyle = {
    backgroundColor: theme.pageBackground,
    padding: sectionPadding,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginTop: sectionGap,
  };

  return (
    <View style={{ flexDirection: 'column', marginBottom: compact ? 0 : 10 }}>
      <View
        style={{
          backgroundColor: theme.pageBackground,
          padding: sectionPadding,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            ...headerTextStyle,
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          {monthUtils.format(data.startMonth, 'MMMM yyyy', locale)}
          {data.startMonth !== data.endMonth &&
            ` – ${monthUtils.format(data.endMonth, 'MMMM yyyy', locale)}`}
        </Text>
        <Text
          style={{
            ...subtitleTextStyle,
            alignItems: 'center',
            marginTop: compact ? 4 : 8,
          }}
        >
          <Trans>Goal Automation Summary</Trans>
        </Text>
      </View>
      <View style={summarySectionStyle}>
        <Text
          style={{
            ...labelTextStyle,
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          <Trans>TOTAL PROJECTED</Trans>
        </Text>
        <FinancialText
          style={{
            ...valueTextStyle,
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          <PrivacyFilter>{format(amounts.needed, 'financial')}</PrivacyFilter>
        </FinancialText>
        <Text style={{ fontWeight: 600, fontSize: compact ? 12 : undefined }}>
          <Trans>For this time period</Trans>
        </Text>
      </View>
      <View style={summarySectionStyle}>
        <Text
          style={{
            ...labelTextStyle,
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          <Trans>GOALS UNDERFUNDED</Trans>
        </Text>
        <FinancialText
          style={{
            ...valueTextStyle,
            alignItems: 'center',
            marginBottom: 2,
            color:
              amounts.remaining > 0
                ? theme.reportsNumberNegative
                : theme.noticeTextLight,
          }}
        >
          <PrivacyFilter>
            {amounts.remaining > 0
              ? format(-amounts.remaining, 'financial')
              : format(0, 'financial')}
          </PrivacyFilter>
        </FinancialText>
        <Text style={{ fontWeight: 600, fontSize: compact ? 12 : undefined }}>
          <Trans>For this time period</Trans>
        </Text>
      </View>
      <View style={summarySectionStyle}>
        <Text
          style={{
            ...labelTextStyle,
            alignItems: 'center',
            marginBottom: 2,
          }}
        >
          <Trans>GOALS OVERFUNDED</Trans>
        </Text>
        <FinancialText
          style={{
            ...valueTextStyle,
            alignItems: 'center',
            marginBottom: 2,
            color:
              amounts.overfunded > 0
                ? theme.reportsNumberPositive
                : theme.noticeTextLight,
          }}
        >
          <PrivacyFilter>
            {format(amounts.overfunded, 'financial')}
          </PrivacyFilter>
        </FinancialText>
        <Text style={{ fontWeight: 600, fontSize: compact ? 12 : undefined }}>
          <Trans>For this time period</Trans>
        </Text>
      </View>
      <View style={{ gap: compact ? 8 : 12, marginTop: compact ? 10 : 16 }}>
        <AlignedText
          left={
            <Block>
              <Trans>Total carried over</Trans>
            </Block>
          }
          right={
            <MonthlyBudgetOverviewAmountCell
              amount={amounts.carriedOver}
              emphasize
            />
          }
        />
        <AlignedText
          left={
            <Block>
              <Trans>Total budgeted toward goals</Trans>
            </Block>
          }
          right={
            <MonthlyBudgetOverviewAmountCell
              amount={amounts.budgeted}
              emphasize
            />
          }
        />
      </View>
    </View>
  );
}
