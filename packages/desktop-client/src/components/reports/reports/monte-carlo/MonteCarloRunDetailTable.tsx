import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
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
import {
  getMonteCarloPotLabel,
  getMonteCarloSurplusPotLabel,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloIncomeStream,
  MonteCarloPot,
  MonteCarloRuleExplanation,
  MonteCarloRunDetailRow,
  MonteCarloWithdrawalRuleConfig,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { GROUP_HEADING_STYLE } from '#components/reports/reports/monte-carlo/monteCarloStyles';
import {
  buildMonteCarloYearStory,
  formatRuleRate,
} from '#components/reports/reports/monte-carlo/monteCarloYearStory';
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
  /** The plan's income streams; the Income column shows when there are any */
  incomeStreams: MonteCarloIncomeStream[];
  /** The configured rule, quoted in the per-year explanations */
  withdrawalRule: MonteCarloWithdrawalRuleConfig;
  /** Rendered between the header row and the table - the cashflow chart */
  cashflowGraph?: ReactNode;
  onBack: () => void;
};

export function MonteCarloRunDetailTable({
  rows,
  pots,
  simulationIndex,
  simulationCount,
  startAge,
  hasContributions,
  incomeStreams,
  withdrawalRule,
  cashflowGraph,
  onBack,
}: MonteCarloRunDetailTableProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  // Years whose detailed working is shown under the summary
  const [workingYears, setWorkingYears] = useState<Set<number>>(new Set());

  const hasIncome = incomeStreams.length > 0;
  const surplusPotName = getMonteCarloSurplusPotLabel(pots, t);
  const hasSurplusPot = pots.some(pot => pot.isSurplus);
  const lastRow = rows[rows.length - 1];
  const hasSurvived = lastRow != null && lastRow.endBalance > 0;
  // Present whenever the plan has inflation enabled
  const showInflation = rows.some(row => row.inflation != null);
  const allExpanded = rows.length > 0 && expandedYears.size === rows.length;

  function toggleInSet(previous: Set<number>, year: number) {
    const next = new Set(previous);
    if (next.has(year)) {
      next.delete(year);
    } else {
      next.add(year);
    }
    return next;
  }

  function toggleYear(year: number) {
    if (expandedYears.has(year)) {
      // Collapsing a year hides its working too, so reopening it starts
      // from the summary again
      setWorkingYears(previous => {
        const next = new Set(previous);
        next.delete(year);
        return next;
      });
    }
    setExpandedYears(previous => toggleInSet(previous, year));
  }

  function toggleWorking(year: number) {
    setWorkingYears(previous => toggleInSet(previous, year));
  }

  // Run-level cost of the plan: what left the pots, and how much of it
  // went to tax and fees rather than spending
  let totalWithdrawn = 0;
  let totalTax = 0;
  let totalFees = 0;
  let totalIncome = 0;
  let totalIncomeTax = 0;
  for (const row of rows) {
    totalWithdrawn += row.withdrawal;
    totalTax += row.taxPaid;
    totalFees += row.feesPaid;
    totalIncome += row.income;
    totalIncomeTax += row.incomeTax;
  }

  function getIncomeTotalsSentence() {
    const total = format(totalIncome, 'financial');
    const tax = format(totalIncomeTax, 'financial');
    if (totalIncomeTax > 0) {
      return t(
        'Income received over this run: {{total}}, of which {{tax}} tax.',
        {
          total,
          tax,
        },
      );
    }
    return t('Income received over this run: {{total}}.', { total });
  }

  // How the year's actual spending compares with the plan: on target or a
  // shortfall (the pots couldn't cover it)
  function getSpentSentence(row: MonteCarloRunDetailRow) {
    const spent = format(row.spent, 'financial');
    const planned = format(row.plannedSpending, 'financial');
    if (row.spent < row.plannedSpending) {
      return t(
        'Spent: {{spent}} of the {{planned}} planned - {{shortfall}} short.',
        {
          spent,
          planned,
          shortfall: format(row.plannedSpending - row.spent, 'financial'),
        },
      );
    }
    if (row.spent > row.plannedSpending) {
      return t(
        'Spent: {{spent}} - {{extra}} more than the {{planned}} planned.',
        {
          spent,
          planned,
          extra: format(row.spent - row.plannedSpending, 'financial'),
        },
      );
    }
    return t('Spent: {{spent}}, as planned.', { spent });
  }

  function getSavedSentence(row: MonteCarloRunDetailRow) {
    return t(
      'Saved into {{pot}}: {{amount}} - income beyond what the plan spends.',
      { pot: surplusPotName, amount: format(row.surplusSaved, 'financial') },
    );
  }

  // "State pension: 12,000.00" - the per-stream lines under a year's
  // income sentence when more than one stream is configured
  function getIncomeStreamLine(incomeIndex: number, amount: number) {
    const incomeStream = incomeStreams[incomeIndex];
    return t('{{name}}: {{amount}}', {
      name:
        incomeStream.name ||
        t('Income {{number}}', { number: incomeIndex + 1 }),
      amount: format(amount, 'financial'),
    });
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

  // One sentence per rule outcome, phrased with the numbers the user
  // configured so each year's working reads like the setup sentence
  function getRuleExplanationSentence(explanation: MonteCarloRuleExplanation) {
    if (explanation.kind === 'anchor') {
      return t(
        "Floor & ceiling: the first spending year takes the planned amount and sets the rule's rate at {{rate}} of the accessible balance; future years stay within {{floorPct}} below and {{ceilingPct}} above the planned amount.",
        {
          rate: formatRuleRate(explanation.rate),
          floorPct: formatRuleRate(withdrawalRule.floorPct),
          ceilingPct: formatRuleRate(withdrawalRule.ceilingPct),
        },
      );
    }
    if (explanation.kind === 'floor-ceiling') {
      const values = {
        rate: formatRuleRate(explanation.rate),
        amount: format(explanation.unclamped, 'financial'),
        floor: format(explanation.floor, 'financial'),
        ceiling: format(explanation.ceiling, 'financial'),
        floorPct: formatRuleRate(withdrawalRule.floorPct),
        ceilingPct: formatRuleRate(withdrawalRule.ceilingPct),
      };
      if (explanation.applied === 'floor') {
        return t(
          'Floor & ceiling: {{rate}} of the accessible balance = {{amount}}, below the floor ({{floorPct}} under the planned amount: {{floor}}) - the floor applied.',
          values,
        );
      }
      if (explanation.applied === 'ceiling') {
        return t(
          'Floor & ceiling: {{rate}} of the accessible balance = {{amount}}, above the ceiling ({{ceilingPct}} over the planned amount: {{ceiling}}) - the ceiling applied.',
          values,
        );
      }
      return t(
        'Floor & ceiling: {{rate}} of the accessible balance = {{amount}}, within {{floorPct}} below ({{floor}}) and {{ceilingPct}} above ({{ceiling}}) the planned amount.',
        values,
      );
    }
    // Concrete money beats abstractions: every outcome shows the rule's
    // result next to the planned amount (any minimum floor is reported
    // by its own line)
    const planned = format(explanation.planned, 'financial');
    const adjusted = format(explanation.adjusted, 'financial');
    const hasEarlierAdjustments = explanation.factor !== 1;
    if (explanation.rule === 'guardrails') {
      const values = {
        currentRate: formatRuleRate(explanation.currentRate ?? 0),
        referenceRate: formatRuleRate(explanation.referenceRate ?? 0),
        trigger: formatRuleRate(withdrawalRule.preservationTriggerPct),
        prosperityTrigger: formatRuleRate(withdrawalRule.prosperityTriggerPct),
        cut: formatRuleRate(withdrawalRule.preservationCutPct),
        raise: formatRuleRate(withdrawalRule.prosperityIncreasePct),
        planned,
        adjusted,
      };
      if (explanation.action === 'cut') {
        return t(
          'Guardrails: the withdrawal rate ({{currentRate}}) rose more than {{trigger}} above the planned rate ({{referenceRate}}), so withdrawals were cut by {{cut}}: {{adjusted}} instead of the planned {{planned}}.',
          values,
        );
      }
      if (explanation.action === 'raise') {
        return t(
          'Guardrails: the withdrawal rate ({{currentRate}}) fell more than {{prosperityTrigger}} below the planned rate ({{referenceRate}}), so withdrawals were raised by {{raise}}: {{adjusted}} instead of the planned {{planned}}.',
          values,
        );
      }
      if (hasEarlierAdjustments) {
        return t(
          'Guardrails: the withdrawal rate ({{currentRate}}) stayed close to the planned rate ({{referenceRate}}) - no new change, but earlier adjustments still apply: {{adjusted}} instead of the planned {{planned}}.',
          values,
        );
      }
      return t(
        'Guardrails: the withdrawal rate ({{currentRate}}) stayed close to the planned rate ({{referenceRate}}) - no change, taking the planned {{planned}}.',
        values,
      );
    }
    if (explanation.rule === 'ratcheting') {
      const values = {
        multiple: `${Number(withdrawalRule.balanceThresholdMultiple.toFixed(2))}×`,
        years: withdrawalRule.consecutiveYears,
        raise: formatRuleRate(withdrawalRule.ratchetIncreasePct),
        streak: explanation.ratchetStreak ?? 0,
        planned,
        adjusted,
      };
      if (explanation.action === 'raise') {
        return t(
          'Ratcheting: the accessible balance stayed above {{multiple}} its starting level for {{years}} years in a row, so withdrawals were raised by {{raise}}: {{adjusted}} instead of the planned {{planned}}.',
          values,
        );
      }
      if (explanation.ratchetStreak != null && explanation.ratchetStreak > 0) {
        return hasEarlierAdjustments
          ? t(
              'Ratcheting: balance above {{multiple}} its starting level for {{streak}} of {{years}} years - no raise yet, but earlier raises still apply: {{adjusted}} instead of the planned {{planned}}.',
              values,
            )
          : t(
              'Ratcheting: balance above {{multiple}} its starting level for {{streak}} of {{years}} years - no raise yet, taking the planned {{planned}}.',
              values,
            );
      }
      return hasEarlierAdjustments
        ? t(
            'Ratcheting: balance below {{multiple}} its starting level - the streak reset, but earlier raises still apply: {{adjusted}} instead of the planned {{planned}}.',
            values,
          )
        : t(
            'Ratcheting: balance below {{multiple}} its starting level - the streak reset, taking the planned {{planned}}.',
            values,
          );
    }
    const boundaryValues = {
      currentRate: formatRuleRate(explanation.currentRate ?? 0),
      upper: formatRuleRate(withdrawalRule.upperRateThreshold),
      lower: formatRuleRate(withdrawalRule.lowerRateThreshold),
      cut: formatRuleRate(withdrawalRule.upperCutPct),
      raise: formatRuleRate(withdrawalRule.lowerIncreasePct),
      planned,
      adjusted,
    };
    if (explanation.action === 'cut') {
      return t(
        'Boundaries: the withdrawal rate ({{currentRate}}) rose above {{upper}}, so withdrawals were cut by {{cut}}: {{adjusted}} instead of the planned {{planned}}.',
        boundaryValues,
      );
    }
    if (explanation.action === 'raise') {
      return t(
        'Boundaries: the withdrawal rate ({{currentRate}}) fell below {{lower}}, so withdrawals were raised by {{raise}}: {{adjusted}} instead of the planned {{planned}}.',
        boundaryValues,
      );
    }
    if (hasEarlierAdjustments) {
      return t(
        'Boundaries: the withdrawal rate ({{currentRate}}) stayed between {{lower}} and {{upper}} - no new change, but earlier adjustments still apply: {{adjusted}} instead of the planned {{planned}}.',
        boundaryValues,
      );
    }
    return t(
      'Boundaries: the withdrawal rate ({{currentRate}}) stayed between {{lower}} and {{upper}} - no change, taking the planned {{planned}}.',
      boundaryValues,
    );
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
          onPress={() => {
            setExpandedYears(
              allExpanded ? new Set() : new Set(rows.map(row => row.year)),
            );
            if (allExpanded) {
              setWorkingYears(new Set());
            }
          }}
          style={{ marginLeft: 'auto', color: theme.pageText }}
        >
          {allExpanded ? (
            <Trans>Collapse all years</Trans>
          ) : (
            <Trans>Expand all years</Trans>
          )}
        </Button>
      </View>

      {cashflowGraph}

      <Text style={{ fontSize: 13, color: theme.pageText, marginBottom: 10 }}>
        <PrivacyFilter>
          <FinancialText as="span">{getTotalsSentence()}</FinancialText>
        </PrivacyFilter>
        {totalIncome > 0 && (
          <>
            {' '}
            <PrivacyFilter>
              <FinancialText as="span">
                {getIncomeTotalsSentence()}
              </FinancialText>
            </PrivacyFilter>
          </>
        )}
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
            {hasIncome && (
              <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
                <Trans>Income (net)</Trans>
              </Text>
            )}
            <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Withdrawal</Trans>
            </Text>
            <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Spent</Trans>
            </Text>
            <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Investment growth</Trans>
            </Text>
            <Text
              style={{ ...GROUP_HEADING_STYLE, width: 90, textAlign: 'right' }}
            >
              <Trans>Return (%)</Trans>
            </Text>
            {showInflation && (
              <Text
                style={{
                  ...GROUP_HEADING_STYLE,
                  width: 110,
                  textAlign: 'right',
                }}
              >
                <Trans>Inflation (%)</Trans>
              </Text>
            )}
            <Text style={{ ...GROUP_HEADING_STYLE, ...AMOUNT_CELL_STYLE }}>
              <Trans>Ending balance</Trans>
            </Text>
          </View>

          {rows.map(row => {
            const isFailureRow = row === lastRow && !hasSurvived;
            const isExpanded = expandedYears.has(row.year);
            const showsWorking = workingYears.has(row.year);
            // Growth applies to what stayed invested after contributions
            // came in and the withdrawal went out; no growth on a failure
            // year (the plan stops there)
            const growthBase =
              row.startBalance +
              row.contributions +
              row.surplusSaved -
              row.withdrawal;
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
                          {format(
                            row.contributions + row.surplusSaved,
                            'financial',
                          )}
                        </FinancialText>
                      </PrivacyFilter>
                    </Text>
                  )}
                  {hasIncome && (
                    <Text style={AMOUNT_CELL_STYLE}>
                      <PrivacyFilter>
                        <FinancialText as="span">
                          {format(row.income - row.incomeTax, 'financial')}
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
                      // A year that couldn't be fully paid for stands out
                      ...(row.spent < row.plannedSpending && {
                        color: theme.reportsNumberNegative,
                      }),
                    }}
                  >
                    <PrivacyFilter>
                      <FinancialText as="span">
                        {format(row.spent, 'financial')}
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
                  {showInflation && (
                    // Deliberately neutral: coloring deflation "good" or
                    // inflation "bad" would oversimplify
                    <Text style={{ width: 110, textAlign: 'right' }}>
                      {row.inflation != null && (
                        <FinancialText as="span">
                          {`${(row.inflation * 100).toFixed(2)}%`}
                        </FinancialText>
                      )}
                    </Text>
                  )}
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
                          {buildMonteCarloYearStory({
                            row,
                            withdrawalRule,
                            surplusPotName,
                            hasSurplusPot,
                            format,
                            translate: t,
                          }).join(' ')}
                        </FinancialText>
                      </PrivacyFilter>
                    </Text>
                    <Button
                      variant="bare"
                      onPress={() => toggleWorking(row.year)}
                      style={{
                        alignSelf: 'flex-start',
                        padding: 0,
                        color: theme.pageTextLight,
                        textDecoration: 'underline',
                      }}
                    >
                      {showsWorking ? (
                        <Trans>Hide the working</Trans>
                      ) : (
                        <Trans>Show the working</Trans>
                      )}
                    </Button>
                    {showsWorking && (
                      <View style={{ gap: 4, marginTop: 6 }}>
                        {row.ruleExplanation != null && (
                          <Text style={{ fontSize: 13, color: theme.pageText }}>
                            <PrivacyFilter>
                              <FinancialText as="span">
                                {getRuleExplanationSentence(
                                  row.ruleExplanation,
                                )}
                              </FinancialText>
                            </PrivacyFilter>
                          </Text>
                        )}
                        {row.minimumApplied && (
                          <Text style={{ fontSize: 13, color: theme.pageText }}>
                            <PrivacyFilter>
                              <FinancialText as="span">
                                {t(
                                  'Raised to the minimum spending: {{amount}}.',
                                  {
                                    amount: format(
                                      row.plannedSpending,
                                      'financial',
                                    ),
                                  },
                                )}
                              </FinancialText>
                            </PrivacyFilter>
                          </Text>
                        )}
                        {row.income > 0 && (
                          <Text style={{ fontSize: 13, color: theme.pageText }}>
                            <PrivacyFilter>
                              <FinancialText as="span">
                                {row.incomeTax > 0
                                  ? t(
                                      'Income: {{gross}} gross − {{tax}} tax = {{net}} received.',
                                      {
                                        gross: format(row.income, 'financial'),
                                        tax: format(row.incomeTax, 'financial'),
                                        net: format(
                                          row.income - row.incomeTax,
                                          'financial',
                                        ),
                                      },
                                    )
                                  : t('Income: {{gross}}, untaxed.', {
                                      gross: format(row.income, 'financial'),
                                    })}
                                {incomeStreams.length > 1 &&
                                  ` (${row.incomeAmounts
                                    .map((amount, incomeIndex) =>
                                      amount > 0
                                        ? getIncomeStreamLine(
                                            incomeIndex,
                                            amount,
                                          )
                                        : null,
                                    )
                                    .filter(line => line != null)
                                    .join('; ')})`}
                              </FinancialText>
                            </PrivacyFilter>
                          </Text>
                        )}
                        <Text style={{ fontSize: 13, color: theme.pageText }}>
                          <PrivacyFilter>
                            <FinancialText as="span">
                              {row.taxPaid > 0
                                ? t(
                                    'Withdrawal: {{gross}} gross − {{tax}} tax = {{net}} to spend.',
                                    {
                                      gross: format(
                                        row.withdrawal,
                                        'financial',
                                      ),
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
                        <Text style={{ fontSize: 13, color: theme.pageText }}>
                          <PrivacyFilter>
                            <FinancialText as="span">
                              {getSpentSentence(row)}
                            </FinancialText>
                          </PrivacyFilter>
                        </Text>
                        {row.surplusSaved > 0 && (
                          <Text style={{ fontSize: 13, color: theme.pageText }}>
                            <PrivacyFilter>
                              <FinancialText as="span">
                                {getSavedSentence(row)}
                              </FinancialText>
                            </PrivacyFilter>
                          </Text>
                        )}
                        {row.unspentIncome > 0 && row.surplusSaved === 0 && (
                          <Text style={{ fontSize: 13, color: theme.pageText }}>
                            <PrivacyFilter>
                              <FinancialText as="span">
                                {t(
                                  'Unspent income: {{amount}} - more came in than the plan spends, and it leaves the plan.',
                                  {
                                    amount: format(
                                      row.unspentIncome,
                                      'financial',
                                    ),
                                  },
                                )}
                              </FinancialText>
                            </PrivacyFilter>
                          </Text>
                        )}
                        {row.contributions > 0 && (
                          <Text style={{ fontSize: 13, color: theme.pageText }}>
                            <PrivacyFilter>
                              <FinancialText as="span">
                                {t(
                                  'Contributions: {{amount}}, added at the start of the year.',
                                  {
                                    amount: format(
                                      row.contributions,
                                      'financial',
                                    ),
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
                      </View>
                    )}

                    {pots.length > 0 && (
                      <View
                        style={{
                          marginTop: 14,
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
                            <View
                              style={{
                                width: 130,
                                flexShrink: 0,
                                flexDirection: 'row',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Text style={GROUP_HEADING_STYLE}>
                                <Trans>Contributed</Trans>
                              </Text>
                              {hasSurplusPot && (
                                <MonteCarloHelpTooltip placement="bottom end">
                                  <Trans>
                                    For the {{ surplusPotName }} pot this is the
                                    money the plan didn&apos;t spend that year,
                                    saved into it before growth.
                                  </Trans>
                                </MonteCarloHelpTooltip>
                              )}
                            </View>
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
                                {getMonteCarloPotLabel(pots, potIndex, t)}
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
                                        (row.potContributions[potIndex] ?? 0) +
                                          (pot.isSurplus
                                            ? row.surplusSaved
                                            : 0),
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
