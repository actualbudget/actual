import { Fragment, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronDown,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { MonteCarloHelpTooltip } from '#components/reports/reports/monte-carlo/MonteCarloHelpTooltip';
import type {
  MonteCarloPot,
  MonteCarloRunDetailRow,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { GROUP_HEADING_STYLE } from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { useFormat } from '#hooks/useFormat';

// The minWidth keeps amounts readable on narrow screens - the table
// scrolls sideways instead of letting columns collapse into each other
const AMOUNT_CELL_STYLE = {
  flex: 1,
  minWidth: 110,
  textAlign: 'right',
} as const;

// Pot mini-table cells must not shrink, so on narrow screens the panel
// pushes the shared scroll container wider instead of clipping columns
const POT_CELL_STYLE = {
  flexShrink: 0,
  textAlign: 'right',
} as const;

type MonteCarloRunDetailTableProps = {
  rows: MonteCarloRunDetailRow[];
  pots: MonteCarloPot[];
  simulationIndex: number;
  simulationCount: number;
  startAge: number;
  /** Show the Contributions columns (the plan has contributions set up) */
  hasContributions: boolean;
  onBack: () => void;
};

export function MonteCarloRunDetailTable({
  rows,
  pots,
  simulationIndex,
  simulationCount,
  startAge,
  hasContributions,
  onBack,
}: MonteCarloRunDetailTableProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  const lastRow = rows[rows.length - 1];
  const hasSurvived = lastRow != null && lastRow.endBalance > 0;
  const allExpanded = rows.length > 0 && expandedYears.size === rows.length;

  function toggleYear(year: number) {
    setExpandedYears(previous => {
      const next = new Set(previous);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  }

  // Run-level cost of the plan: what left the pots, and how much of it
  // went to tax and fees rather than spending
  let totalWithdrawn = 0;
  let totalTax = 0;
  let totalFees = 0;
  for (const row of rows) {
    totalWithdrawn += row.withdrawal;
    totalTax += row.taxPaid;
    totalFees += row.feesPaid;
  }

  // Four sentence variants so each language can phrase the combinations
  // naturally
  function getTotalsSentence() {
    const total = format(totalWithdrawn, 'financial');
    const tax = format(totalTax, 'financial');
    const fees = format(totalFees, 'financial');
    if (totalTax > 0 && totalFees > 0) {
      return t(
        'Total withdrawn over this run: {{total}}, of which {{tax}} tax, plus {{fees}} paid in fees.',
        { total, tax, fees },
      );
    }
    if (totalTax > 0) {
      return t(
        'Total withdrawn over this run: {{total}}, of which {{tax}} tax.',
        { total, tax },
      );
    }
    if (totalFees > 0) {
      return t(
        'Total withdrawn over this run: {{total}}, plus {{fees}} paid in fees.',
        { total, fees },
      );
    }
    return t('Total withdrawn over this run: {{total}}.', { total });
  }

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
                number: simulationIndex + 1,
                total: simulationCount,
                age: lastRow ? startAge + lastRow.year : startAge,
              })
            : t('Run {{number}} of {{total}} - ran out at age {{age}}', {
                number: simulationIndex + 1,
                total: simulationCount,
                // The failure row's own age: the year the withdrawal
                // couldn't be funded
                age: lastRow ? startAge + lastRow.year - 1 : startAge,
              })}
        </Text>
        <Button
          variant="bare"
          onPress={() =>
            setExpandedYears(
              allExpanded ? new Set() : new Set(rows.map(row => row.year)),
            )
          }
          style={{ marginLeft: 'auto', color: theme.pageText }}
        >
          {allExpanded ? (
            <Trans>Collapse all years</Trans>
          ) : (
            <Trans>Expand all years</Trans>
          )}
        </Button>
      </View>

      <Text style={{ fontSize: 13, color: theme.pageText, marginBottom: 10 }}>
        <PrivacyFilter>
          <FinancialText as="span">{getTotalsSentence()}</FinancialText>
        </PrivacyFilter>
      </Text>

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
            <View style={{ width: 36 }} />
            <Text style={{ ...GROUP_HEADING_STYLE, width: 60 }}>
              <Trans>Age</Trans>
            </Text>
            <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Starting balance</Trans>
            </Text>
            {hasContributions && (
              <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
                <Trans>Contributions</Trans>
              </Text>
            )}
            <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Withdrawal</Trans>
            </Text>
            <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Investment growth</Trans>
            </Text>
            <Text
              style={{ ...GROUP_HEADING_STYLE, width: 90, textAlign: 'right' }}
            >
              <Trans>Return (%)</Trans>
            </Text>
            <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Ending balance</Trans>
            </Text>
          </View>

          {rows.map(row => {
            const isFailureRow = row === lastRow && !hasSurvived;
            const isExpanded = expandedYears.has(row.year);
            // Growth applies to what stayed invested after contributions
            // came in and the withdrawal went out; no growth on a failure
            // year (the plan stops there)
            const growthBase =
              row.startBalance + row.contributions - row.withdrawal;
            const growthPct =
              !isFailureRow && growthBase > 0
                ? (row.growth / growthBase) * 100
                : null;
            const netSpending = row.withdrawal - row.taxPaid;
            return (
              <Fragment key={row.year}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: `1px solid ${theme.tableBorder}`,
                    gap: 10,
                  }}
                >
                  <View style={{ width: 36, alignItems: 'center' }}>
                    <Button
                      variant="bare"
                      aria-label={
                        isExpanded
                          ? t("Hide this year's breakdown")
                          : t("Show this year's breakdown")
                      }
                      onPress={() => toggleYear(row.year)}
                      style={{ padding: 4 }}
                    >
                      {isExpanded ? (
                        <SvgCheveronDown width={14} height={14} />
                      ) : (
                        <SvgCheveronRight width={14} height={14} />
                      )}
                    </Button>
                  </View>
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
                  {hasContributions && (
                    <Text style={AMOUNT_CELL_STYLE}>
                      <PrivacyFilter>
                        <FinancialText as="span">
                          {format(row.contributions, 'financial')}
                        </FinancialText>
                      </PrivacyFilter>
                    </Text>
                  )}
                  <Text style={AMOUNT_CELL_STYLE}>
                    <PrivacyFilter>
                      <FinancialText as="span">
                        {format(row.withdrawal, 'financial')}
                      </FinancialText>
                    </PrivacyFilter>
                  </Text>
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
                        {/* On a bridge-gap failure the true remaining balance
                        is the locked money, not zero */}
                        {format(
                          row.inaccessibleBalance ?? row.endBalance,
                          'financial',
                        )}
                      </FinancialText>
                    </PrivacyFilter>
                  </Text>
                </View>

                {isExpanded && (
                  <View
                    style={{
                      borderBottom: `1px solid ${theme.tableBorder}`,
                      padding: '10px 12px 12px 46px',
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: theme.pageText }}>
                      <PrivacyFilter>
                        <FinancialText as="span">
                          {row.taxPaid > 0
                            ? t(
                                'Withdrawal: {{gross}} gross − {{tax}} tax = {{net}} to spend.',
                                {
                                  gross: format(row.withdrawal, 'financial'),
                                  tax: format(row.taxPaid, 'financial'),
                                  net: format(netSpending, 'financial'),
                                },
                              )
                            : t('Withdrawal: {{gross}}, untaxed.', {
                                gross: format(row.withdrawal, 'financial'),
                              })}
                        </FinancialText>
                      </PrivacyFilter>
                    </Text>
                    {row.contributions > 0 && (
                      <Text style={{ fontSize: 13, color: theme.pageText }}>
                        <PrivacyFilter>
                          <FinancialText as="span">
                            {t(
                              'Contributions: {{amount}}, added at the start of the year.',
                              {
                                amount: format(row.contributions, 'financial'),
                              },
                            )}
                          </FinancialText>
                        </PrivacyFilter>
                      </Text>
                    )}
                    {row.feesPaid > 0 && (
                      <Text style={{ fontSize: 13, color: theme.pageText }}>
                        <PrivacyFilter>
                          <FinancialText as="span">
                            {t(
                              'Fees paid: {{amount}}, charged at the end of the year.',
                              {
                                amount: format(row.feesPaid, 'financial'),
                              },
                            )}
                          </FinancialText>
                        </PrivacyFilter>
                      </Text>
                    )}
                    {row.inaccessibleBalance != null && (
                      <Text style={{ fontSize: 13, color: theme.pageText }}>
                        <PrivacyFilter>
                          <FinancialText as="span">
                            {t(
                              '{{amount}} remained locked in pots that had not reached their access age.',
                              {
                                amount: format(
                                  row.inaccessibleBalance,
                                  'financial',
                                ),
                              },
                            )}
                          </FinancialText>
                        </PrivacyFilter>
                      </Text>
                    )}

                    {pots.length > 0 && (
                      <View
                        style={{
                          marginTop: 6,
                          maxWidth: hasContributions ? 1150 : 1010,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            gap: 10,
                            paddingBottom: 4,
                            borderBottom: `1px solid ${theme.tableBorder}`,
                          }}
                        >
                          <Text
                            style={{
                              ...GROUP_HEADING_STYLE,
                              flex: 1,
                              minWidth: 120,
                            }}
                          >
                            <Trans>Pot</Trans>
                          </Text>
                          <Text
                            style={{
                              ...GROUP_HEADING_STYLE,
                              ...POT_CELL_STYLE,
                              width: 130,
                            }}
                          >
                            <Trans>Start balance</Trans>
                          </Text>
                          {hasContributions && (
                            <Text
                              style={{
                                ...GROUP_HEADING_STYLE,
                                ...POT_CELL_STYLE,
                                width: 130,
                              }}
                            >
                              <Trans>Contributed</Trans>
                            </Text>
                          )}
                          <Text
                            style={{
                              ...GROUP_HEADING_STYLE,
                              ...POT_CELL_STYLE,
                              width: 130,
                            }}
                          >
                            <Trans>Withdrawn</Trans>
                          </Text>
                          <Text
                            style={{
                              ...GROUP_HEADING_STYLE,
                              ...POT_CELL_STYLE,
                              width: 110,
                            }}
                          >
                            <Trans>Taxable</Trans>
                          </Text>
                          <View
                            style={{
                              width: 110,
                              flexShrink: 0,
                              flexDirection: 'row',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={GROUP_HEADING_STYLE}>
                              <Trans>Tax paid</Trans>
                            </Text>
                            <MonteCarloHelpTooltip placement="bottom end">
                              <Trans>
                                With tax bands, the year&apos;s tax is worked
                                out on all pots&apos; taxable income together,
                                then shared here in proportion to each
                                pot&apos;s taxable income - so every taxable
                                pound bears the year&apos;s average rate, even
                                from a small pot. With a flat rate per pot, each
                                pot&apos;s tax is exact.
                              </Trans>
                            </MonteCarloHelpTooltip>
                          </View>
                          <View
                            style={{
                              width: 110,
                              flexShrink: 0,
                              flexDirection: 'row',
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Text style={GROUP_HEADING_STYLE}>
                              <Trans>Fees</Trans>
                            </Text>
                            <MonteCarloHelpTooltip placement="bottom end">
                              <Trans>
                                Charged at the end of the year, on the
                                pot&apos;s balance after that year&apos;s growth
                                but before the fee itself is deducted - so the
                                end balance is the post-growth balance minus
                                this fee.
                              </Trans>
                            </MonteCarloHelpTooltip>
                          </View>
                          <Text
                            style={{
                              ...GROUP_HEADING_STYLE,
                              ...POT_CELL_STYLE,
                              width: 90,
                            }}
                          >
                            <Trans>Return (%)</Trans>
                          </Text>
                          <Text
                            style={{
                              ...GROUP_HEADING_STYLE,
                              ...POT_CELL_STYLE,
                              width: 130,
                            }}
                          >
                            <Trans>End balance</Trans>
                          </Text>
                        </View>
                        {pots.map((pot, potIndex) => {
                          const potReturn = row.potReturns[potIndex];
                          return (
                            <View
                              key={pot.id}
                              style={{
                                flexDirection: 'row',
                                gap: 10,
                                padding: '3px 0',
                              }}
                            >
                              <Text style={{ flex: 1, minWidth: 120 }}>
                                {pot.name ||
                                  t('Pot {{number}}', {
                                    number: potIndex + 1,
                                  })}
                              </Text>
                              <Text style={{ ...POT_CELL_STYLE, width: 130 }}>
                                <PrivacyFilter>
                                  <FinancialText as="span">
                                    {format(
                                      row.potStartBalances[potIndex] ?? 0,
                                      'financial',
                                    )}
                                  </FinancialText>
                                </PrivacyFilter>
                              </Text>
                              {hasContributions && (
                                <Text style={{ ...POT_CELL_STYLE, width: 130 }}>
                                  <PrivacyFilter>
                                    <FinancialText as="span">
                                      {format(
                                        row.potContributions[potIndex] ?? 0,
                                        'financial',
                                      )}
                                    </FinancialText>
                                  </PrivacyFilter>
                                </Text>
                              )}
                              <Text style={{ ...POT_CELL_STYLE, width: 130 }}>
                                <PrivacyFilter>
                                  <FinancialText as="span">
                                    {format(
                                      row.potWithdrawals[potIndex] ?? 0,
                                      'financial',
                                    )}
                                  </FinancialText>
                                </PrivacyFilter>
                              </Text>
                              <Text style={{ ...POT_CELL_STYLE, width: 110 }}>
                                <PrivacyFilter>
                                  <FinancialText as="span">
                                    {format(
                                      row.potTaxables[potIndex] ?? 0,
                                      'financial',
                                    )}
                                  </FinancialText>
                                </PrivacyFilter>
                              </Text>
                              <Text style={{ ...POT_CELL_STYLE, width: 110 }}>
                                <PrivacyFilter>
                                  <FinancialText as="span">
                                    {format(
                                      row.potTaxes[potIndex] ?? 0,
                                      'financial',
                                    )}
                                  </FinancialText>
                                </PrivacyFilter>
                              </Text>
                              <Text style={{ ...POT_CELL_STYLE, width: 110 }}>
                                <PrivacyFilter>
                                  <FinancialText as="span">
                                    {format(
                                      row.potFees[potIndex] ?? 0,
                                      'financial',
                                    )}
                                  </FinancialText>
                                </PrivacyFilter>
                              </Text>
                              <Text
                                style={{
                                  ...POT_CELL_STYLE,
                                  width: 90,
                                  color:
                                    potReturn == null
                                      ? theme.pageText
                                      : potReturn >= 0
                                        ? theme.reportsNumberPositive
                                        : theme.reportsNumberNegative,
                                }}
                              >
                                {potReturn != null && (
                                  <FinancialText as="span">
                                    {`${(potReturn * 100).toFixed(2)}%`}
                                  </FinancialText>
                                )}
                              </Text>
                              <Text style={{ ...POT_CELL_STYLE, width: 130 }}>
                                <PrivacyFilter>
                                  <FinancialText as="span">
                                    {format(
                                      row.potBalances[potIndex] ?? 0,
                                      'financial',
                                    )}
                                  </FinancialText>
                                </PrivacyFilter>
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </Fragment>
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
