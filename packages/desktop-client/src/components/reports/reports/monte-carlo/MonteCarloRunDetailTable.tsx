import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import type {
  MonteCarloPot,
  MonteCarloRunDetailRow,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { useFormat } from '#hooks/useFormat';

const HEADER_CELL_STYLE = {
  fontWeight: 600,
  color: theme.pageText,
  textTransform: 'uppercase',
  fontSize: 12,
  letterSpacing: 0.5,
} as const;

// The minWidth keeps amounts readable on narrow screens - the table
// scrolls sideways instead of letting columns collapse into each other
const AMOUNT_CELL_STYLE = {
  flex: 1,
  minWidth: 110,
  textAlign: 'right',
} as const;

type MonteCarloRunDetailTableProps = {
  rows: MonteCarloRunDetailRow[];
  pots: MonteCarloPot[];
  simIndex: number;
  simulationCount: number;
  startAge: number;
  onBack: () => void;
};

export function MonteCarloRunDetailTable({
  rows,
  pots,
  simIndex,
  simulationCount,
  startAge,
  onBack,
}: MonteCarloRunDetailTableProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const lastRow = rows[rows.length - 1];
  const hasSurvived = lastRow != null && lastRow.endBalance > 0;
  const showPotColumns = pots.length > 0;

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 15,
          marginBottom: 10,
        }}
      >
        <Button onPress={onBack}>
          <Trans>Back to all runs</Trans>
        </Button>
        <Text style={{ fontWeight: 600 }}>
          {hasSurvived
            ? t('Run {{number}} of {{total}} - survived to age {{age}}', {
                number: simIndex + 1,
                total: simulationCount,
                age: lastRow ? startAge + lastRow.year : startAge,
              })
            : t('Run {{number}} of {{total}} - ran out at age {{age}}', {
                number: simIndex + 1,
                total: simulationCount,
                // The failure row's own age: the year the withdrawal
                // couldn't be funded
                age: lastRow ? startAge + lastRow.year - 1 : startAge,
              })}
        </Text>
      </View>

      <View style={{ ...styles.horizontalScrollbar, overflowX: 'auto' }}>
        <View style={{ minWidth: 'fit-content' }}>
          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              paddingBottom: 8,
              borderBottom: `1px solid ${theme.tableBorder}`,
              gap: 10,
            }}
          >
            <Text style={{ ...HEADER_CELL_STYLE, width: 60 }}>
              <Trans>Age</Trans>
            </Text>
            <Text style={{ ...HEADER_CELL_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Starting balance</Trans>
            </Text>
            <Text style={{ ...HEADER_CELL_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Withdrawal</Trans>
            </Text>
            {showPotColumns &&
              pots.map((pot, potIndex) => (
                <Text
                  key={pot.id}
                  style={{ ...HEADER_CELL_STYLE, ...AMOUNT_CELL_STYLE }}
                >
                  {pot.name || t('Pot {{number}}', { number: potIndex + 1 })}
                </Text>
              ))}
            <Text style={{ ...HEADER_CELL_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Investment growth</Trans>
            </Text>
            <Text
              style={{ ...HEADER_CELL_STYLE, width: 90, textAlign: 'right' }}
            >
              <Trans>Return (%)</Trans>
            </Text>
            <Text style={{ ...HEADER_CELL_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Ending balance</Trans>
            </Text>
          </View>

          {rows.map(row => {
            const isFailureRow = row === lastRow && !hasSurvived;
            // Growth applies to what stayed invested after the withdrawal; no
            // growth on a failure year (the plan stops there)
            const growthBase = row.startBalance - row.withdrawal;
            const growthPct =
              !isFailureRow && growthBase > 0
                ? (row.growth / growthBase) * 100
                : null;
            return (
              <View
                key={row.year}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: `1px solid ${theme.tableBorder}`,
                  gap: 10,
                }}
              >
                <Text style={{ width: 60 }}>
                  <FinancialText as="span">
                    {String(startAge + row.year - 1)}
                  </FinancialText>
                </Text>
                <Text style={AMOUNT_CELL_STYLE}>
                  <PrivacyFilter>
                    <FinancialText as="span">
                      {format(row.startBalance, 'financial')}
                    </FinancialText>
                  </PrivacyFilter>
                </Text>
                <View
                  style={{ flex: 1, minWidth: 110, alignItems: 'flex-end' }}
                >
                  <Text>
                    <PrivacyFilter>
                      <FinancialText as="span">
                        {format(row.withdrawal, 'financial')}
                      </FinancialText>
                    </PrivacyFilter>
                  </Text>
                  {row.taxPaid > 0 && (
                    <Text
                      style={{ fontSize: 11, color: theme.warningText }}
                      title={t('Tax paid out of this withdrawal')}
                    >
                      <PrivacyFilter>
                        <FinancialText as="span">
                          {t('incl. {{amount}} tax', {
                            amount: format(row.taxPaid, 'financial'),
                          })}
                        </FinancialText>
                      </PrivacyFilter>
                    </Text>
                  )}
                </View>
                {showPotColumns &&
                  row.potBalances.map((potBalance, potIndex) => {
                    const potReturn = row.potReturns[potIndex];
                    const potWithdrawal = row.potWithdrawals[potIndex] ?? 0;
                    return (
                      <View
                        key={pots[potIndex]?.id ?? potIndex}
                        style={{
                          flex: 1,
                          minWidth: 110,
                          alignItems: 'flex-end',
                        }}
                      >
                        <Text>
                          <PrivacyFilter>
                            <FinancialText as="span">
                              {format(potBalance, 'financial')}
                            </FinancialText>
                          </PrivacyFilter>
                        </Text>
                        {potWithdrawal > 0 && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: theme.warningText,
                            }}
                            title={t('Withdrawn from this pot')}
                          >
                            <PrivacyFilter>
                              <FinancialText as="span">
                                {`−${format(potWithdrawal, 'financial')}`}
                              </FinancialText>
                            </PrivacyFilter>
                          </Text>
                        )}
                        {potReturn != null && (
                          <Text
                            style={{
                              fontSize: 11,
                              color:
                                potReturn >= 0
                                  ? theme.reportsNumberPositive
                                  : theme.reportsNumberNegative,
                            }}
                          >
                            <FinancialText as="span">
                              {`${(potReturn * 100).toFixed(2)}%`}
                            </FinancialText>
                          </Text>
                        )}
                      </View>
                    );
                  })}
                <Text
                  style={{
                    ...AMOUNT_CELL_STYLE,
                    color:
                      row.growth >= 0
                        ? theme.reportsNumberPositive
                        : theme.reportsNumberNegative,
                  }}
                >
                  {!isFailureRow && (
                    <PrivacyFilter>
                      <FinancialText as="span">
                        {format(row.growth, 'financial')}
                      </FinancialText>
                    </PrivacyFilter>
                  )}
                </Text>
                <Text
                  style={{
                    width: 90,
                    textAlign: 'right',
                    color:
                      row.growth >= 0
                        ? theme.reportsNumberPositive
                        : theme.reportsNumberNegative,
                  }}
                >
                  {growthPct != null && (
                    <FinancialText as="span">{`${growthPct.toFixed(2)}%`}</FinancialText>
                  )}
                </Text>
                <Text style={AMOUNT_CELL_STYLE}>
                  <PrivacyFilter>
                    <FinancialText as="span">
                      {/* On a bridge-gap failure the true remaining balance is
                      the locked money, not zero */}
                      {format(
                        row.inaccessibleBalance ?? row.endBalance,
                        'financial',
                      )}
                    </FinancialText>
                  </PrivacyFilter>
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {lastRow?.inaccessibleBalance != null && (
        <Text style={{ marginTop: 10, color: theme.pageText }}>
          {t(
            'The plan failed at age {{age}} with {{amount}} still locked in pots that had not reached their access age.',
            {
              age: startAge + lastRow.year - 1,
              amount: format(lastRow.inaccessibleBalance, 'financial'),
            },
          )}
        </Text>
      )}
    </View>
  );
}
