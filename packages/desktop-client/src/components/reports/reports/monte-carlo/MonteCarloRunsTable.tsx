import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { GROUP_HEADING_STYLE } from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { useFormat } from '#hooks/useFormat';

const PAGE_SIZE = 20;

type SortOrder = 'worst-first' | 'best-first';

type MonteCarloRunsTableProps = {
  endingBalances: Float64Array;
  depletionYearBySimulation: Int32Array;
  totalWithdrawnBySimulation: Float64Array;
  startAge: number;
  onSelectRun: (simulationIndex: number) => void;
};

export function MonteCarloRunsTable({
  endingBalances,
  depletionYearBySimulation,
  totalWithdrawnBySimulation,
  startAge,
  onSelectRun,
}: MonteCarloRunsTableProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const [sortOrder, setSortOrder] = useState<SortOrder>('worst-first');
  const [page, setPage] = useState(0);
  const [highlightedRank, setHighlightedRank] = useState<number | null>(null);

  const simulationCount = endingBalances.length;

  // Jump straight to a given percentile of the ranked outcomes (0 = worst,
  // 1 = best), landing on its page and highlighting the exact run
  function jumpToPercentile(percentile: number) {
    const worstFirstRank = Math.round(percentile * (simulationCount - 1));
    const rank =
      sortOrder === 'worst-first'
        ? worstFirstRank
        : simulationCount - 1 - worstFirstRank;
    setPage(Math.floor(rank / PAGE_SIZE));
    setHighlightedRank(rank);
  }

  // Rank every run: by ending balance, using the depletion year to order
  // the failed runs (which all end at zero) among themselves
  const rankedIndices = Array.from(
    { length: simulationCount },
    (_, index) => index,
  );
  rankedIndices.sort((runA, runB) => {
    const balanceDiff = endingBalances[runA] - endingBalances[runB];
    if (balanceDiff !== 0) {
      return balanceDiff;
    }
    // Survivors (-1) rank after any depleted run; explicit branches so
    // two survivors compare as a tie instead of Infinity - Infinity
    const runADepletionYear = depletionYearBySimulation[runA];
    const runBDepletionYear = depletionYearBySimulation[runB];
    const runASurvived = runADepletionYear === -1;
    const runBSurvived = runBDepletionYear === -1;
    if (runASurvived && runBSurvived) {
      return 0;
    }
    if (runASurvived) {
      return 1;
    }
    if (runBSurvived) {
      return -1;
    }
    return runADepletionYear - runBDepletionYear;
  });
  if (sortOrder === 'best-first') {
    rankedIndices.reverse();
  }

  const pageCount = Math.max(1, Math.ceil(simulationCount / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const pageIndices = rankedIndices.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <Text>
          {t('Showing {{from}}-{{to}} of {{total}} runs', {
            from: pageStart + 1,
            to: pageStart + pageIndices.length,
            total: simulationCount,
          })}
        </Text>
        <Select
          value={sortOrder}
          onChange={value => {
            setSortOrder(value as SortOrder);
            setPage(0);
            setHighlightedRank(null);
          }}
          options={[
            ['worst-first', t('Worst outcomes first')],
            ['best-first', t('Best outcomes first')],
          ]}
          style={{ width: 200 }}
        />
      </View>

      {/* Header row */}
      <View
        style={{
          flexDirection: 'row',
          paddingBottom: 8,
          paddingLeft: 8,
          paddingRight: 8,
          borderBottom: `1px solid ${theme.tableBorder}`,
          gap: 10,
        }}
      >
        <Text style={{ ...GROUP_HEADING_STYLE, width: 80 }}>
          <Trans>Rank</Trans>
        </Text>
        <Text style={{ ...GROUP_HEADING_STYLE, flex: 1 }}>
          <Trans>Outcome</Trans>
        </Text>
        <Text
          style={{ ...GROUP_HEADING_STYLE, width: 160, textAlign: 'right' }}
        >
          <Trans>Ending balance</Trans>
        </Text>
        <Text
          style={{ ...GROUP_HEADING_STYLE, width: 160, textAlign: 'right' }}
        >
          <Trans>Total withdrawn</Trans>
        </Text>
      </View>

      {pageIndices.map((simulationIndex, rowNumber) => {
        const depletionYear = depletionYearBySimulation[simulationIndex];
        const hasSurvived = depletionYear === -1;
        const isHighlighted = highlightedRank === pageStart + rowNumber;
        return (
          <Button
            key={simulationIndex}
            variant="bare"
            onPress={() => onSelectRun(simulationIndex)}
            style={{
              padding: '8px 0',
              borderBottom: `1px solid ${theme.tableBorder}`,
              borderRadius: 0,
              ...(isHighlighted && {
                backgroundColor: theme.tableRowBackgroundHighlight,
              }),
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
                gap: 10,
                paddingLeft: 8,
                paddingRight: 8,
              }}
            >
              <Text style={{ width: 80, textAlign: 'left' }}>
                <FinancialText as="span">
                  {String(pageStart + rowNumber + 1)}
                </FinancialText>
              </Text>
              <Text
                style={{
                  flex: 1,
                  textAlign: 'left',
                  color: hasSurvived
                    ? theme.reportsNumberPositive
                    : theme.reportsNumberNegative,
                }}
              >
                {hasSurvived
                  ? t('Survived')
                  : t('Ran out at age {{age}}', {
                      // The age of the year that couldn't be funded, matching
                      // the drill-in's failure row
                      age: startAge + depletionYear - 1,
                    })}
              </Text>
              <Text style={{ width: 160, textAlign: 'right' }}>
                {hasSurvived ? (
                  <PrivacyFilter>
                    <FinancialText as="span">
                      {format(
                        Math.round(endingBalances[simulationIndex]),
                        'financial',
                      )}
                    </FinancialText>
                  </PrivacyFilter>
                ) : (
                  <FinancialText as="span">-</FinancialText>
                )}
              </Text>
              <Text style={{ width: 160, textAlign: 'right' }}>
                <PrivacyFilter>
                  <FinancialText as="span">
                    {format(
                      Math.round(totalWithdrawnBySimulation[simulationIndex]),
                      'financial',
                    )}
                  </FinancialText>
                </PrivacyFilter>
              </Text>
            </View>
          </Button>
        );
      })}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          // Stays pinned right, and drops to its own line when the jump
          // links need the full width
          marginLeft: 'auto',
          marginTop: 10,
        }}
      >
        <Select
          // An action picker, not a setting: the value stays on the
          // placeholder so it always reads "Jump to..." at rest
          value=""
          onChange={value => {
            if (value !== '') {
              jumpToPercentile(Number(value));
            }
          }}
          options={[
            ['', t('Jump to…')],
            ['0', t('Worst run')],
            ['0.25', t('25th percentile')],
            ['0.5', t('Median run')],
            ['0.75', t('75th percentile')],
            ['1', t('Best run')],
          ]}
          style={{ width: 170 }}
        />
        <Button
          isDisabled={currentPage === 0}
          onPress={() => {
            setPage(currentPage - 1);
            setHighlightedRank(null);
          }}
        >
          <Trans>Previous</Trans>
        </Button>
        <Button
          isDisabled={currentPage >= pageCount - 1}
          onPress={() => {
            setPage(currentPage + 1);
            setHighlightedRank(null);
          }}
        >
          <Trans>Next</Trans>
        </Button>
      </View>
    </View>
  );
}
