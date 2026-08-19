import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { ModeButton } from '@actual-app/components/mode-button';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { MonteCarloWidget } from '@actual-app/core/types/models';

import { EditablePageHeaderTitle } from '#components/EditablePageHeaderTitle';
import { FinancialText } from '#components/FinancialText';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { MobileBackButton } from '#components/mobile/MobileBackButton';
import { MobilePageHeader, Page, PageHeader } from '#components/Page';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { MonteCarloGraph } from '#components/reports/graphs/MonteCarloGraph';
import type { MonteCarloGraphView } from '#components/reports/graphs/MonteCarloGraphTooltip';
import { MonteCarloHistogram } from '#components/reports/graphs/MonteCarloHistogram';
import { LoadingIndicator } from '#components/reports/LoadingIndicator';
import { MonteCarloConfiguration } from '#components/reports/reports/monte-carlo/MonteCarloConfiguration';
import { HISTORICAL_ANNUAL_RETURNS } from '#components/reports/reports/monte-carlo/monteCarloHistoricalReturns';
import { MonteCarloRunDetailTable } from '#components/reports/reports/monte-carlo/MonteCarloRunDetailTable';
import { MonteCarloRunsTable } from '#components/reports/reports/monte-carlo/MonteCarloRunsTable';
import {
  getMonteCarloHorizonYears,
  MONTE_CARLO_DEFAULTS,
  monteCarloConfigFromMeta,
  runMonteCarloSimulation,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type { MonteCarloConfig } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { GROUP_HEADING_STYLE } from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { useResolvedMonteCarloConfig } from '#components/reports/reports/monte-carlo/useResolvedMonteCarloConfig';
import { useDashboardWidget } from '#hooks/useDashboardWidget';
import { useFormat } from '#hooks/useFormat';
import { useNavigate } from '#hooks/useNavigate';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { useUpdateDashboardWidgetMutation } from '#reports/mutations';

const firstYear = HISTORICAL_ANNUAL_RETURNS[0].year;
const lastYear =
  HISTORICAL_ANNUAL_RETURNS[HISTORICAL_ANNUAL_RETURNS.length - 1].year;

export function MonteCarlo() {
  const params = useParams();
  const { data: widget, isLoading } = useDashboardWidget<MonteCarloWidget>({
    id: params.id,
    type: 'monte-carlo-card',
  });

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const format = useFormat();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const [config, setConfig] = useState<MonteCarloConfig>(MONTE_CARLO_DEFAULTS);
  const [graphView, setGraphView] = useState<MonteCarloGraphView>('all');
  const [resultsView, setResultsView] = useState<'chart' | 'runs'>('chart');
  const [showTodaysMoney, setShowTodaysMoney] = useState(true);
  // A selected run refers to a specific simulation, so the selection is
  // stored with the config it belongs to and silently expires when the
  // config changes - no effect, no wasted render with a stale selection
  const [selectedRun, setSelectedRun] = useState<{
    forConfig: MonteCarloConfig;
    index: number;
  } | null>(null);
  const [selectionsInitialized, setSelectionsInitialized] = useState(false);

  const selectedRunIndex =
    selectedRun != null && selectedRun.forConfig === config
      ? selectedRun.index
      : null;

  const resolvedConfig = useResolvedMonteCarloConfig(config);

  // reset when widget changes
  useEffect(() => {
    setSelectionsInitialized(false);
  }, [widget?.id]);

  // initialize once when the widget (if any) is available
  useEffect(() => {
    if (selectionsInitialized || isLoading) {
      return;
    }

    setConfig(monteCarloConfigFromMeta(widget?.meta));
    setSelectionsInitialized(true);
  }, [selectionsInitialized, isLoading, widget?.meta]);

  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

  async function onSaveWidget() {
    // The save button only renders when a widget exists
    if (!widget) {
      return;
    }

    updateDashboardWidgetMutation.mutate(
      {
        widget: {
          id: widget.id,
          meta: {
            ...(widget.meta ?? {}),
            // Persist the resolved config so linked pots' stored balances
            // stay fresh as a fallback while live balances load
            ...resolvedConfig,
          },
        },
      },
      {
        onSuccess: () => {
          dispatch(
            addNotification({
              notification: {
                type: 'message',
                message: t('Dashboard widget successfully saved.'),
              },
            }),
          );
        },
      },
    );
  }

  const title = widget?.meta?.name || t('Monte Carlo Analysis');
  const onSaveWidgetName = async (newName: string) => {
    // The editable title only renders when a widget exists
    if (!widget) {
      return;
    }

    const name = newName || t('Monte Carlo Analysis');
    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.id,
        meta: {
          ...(widget.meta ?? {}),
          name,
        },
      },
    });
  };

  if (isLoading || !selectionsInitialized) {
    return <LoadingIndicator />;
  }

  const simulationParams = {
    ...resolvedConfig,
    horizonYears: getMonteCarloHorizonYears(resolvedConfig),
    deflateToTodaysMoney: showTodaysMoney,
  };
  const result = runMonteCarloSimulation(simulationParams);

  // Runs are seeded, so re-running with a capture index reproduces the
  // selected run exactly; only computed while a run is being inspected
  const runDetailRows =
    selectedRunIndex != null
      ? runMonteCarloSimulation({
          ...simulationParams,
          captureRunDetail: selectedRunIndex,
        }).runDetail
      : null;

  // The age the simulation actually runs to (differs from targetAge only
  // when the configured ages produce a clamped horizon)
  const endAge = config.currentAge + result.horizonYears;
  const successPercent = Math.round(result.successRate * 1000) / 10;
  const depletionPercent = Math.round((1 - result.successRate) * 1000) / 10;
  const failedCount = result.depletionHistogram.reduce(
    (sum, entry) => sum + entry.count,
    0,
  );
  const hasFailures = failedCount > 0;
  const successColor =
    result.successRate >= 0.75
      ? theme.reportsNumberPositive
      : result.successRate >= 0.5
        ? theme.warningText
        : theme.reportsNumberNegative;

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={title}
            leftContent={
              <MobileBackButton onPress={() => navigate('/reports')} />
            }
          />
        ) : (
          <PageHeader
            title={
              widget ? (
                <EditablePageHeaderTitle
                  title={title}
                  onSave={onSaveWidgetName}
                />
              ) : (
                title
              )
            }
          />
        )
      }
      padding={0}
    >
      <View
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingLeft: !isNarrowWidth ? 20 : 10,
          paddingRight: !isNarrowWidth ? 20 : 10,
          paddingBottom: 20,
          gap: 10,
        }}
      >
        {/* Configuration */}
        <View style={{ flexShrink: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              flexShrink: 0,
            }}
          >
            <Text
              style={{
                ...styles.mediumText,
                fontWeight: 600,
              }}
            >
              <Trans>Configuration</Trans>
            </Text>
            {widget && (
              <Button variant="primary" onPress={onSaveWidget}>
                <Trans>Save widget</Trans>
              </Button>
            )}
          </View>
          <MonteCarloConfiguration
            config={resolvedConfig}
            onConfigChange={changes =>
              setConfig(prev => ({ ...prev, ...changes }))
            }
          />
        </View>

        {/* Results */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: '10px 0',
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              ...styles.mediumText,
              fontWeight: 600,
            }}
          >
            <Trans>Results</Trans>
          </Text>
          <LabeledCheckbox
            id="mc-todays-money"
            checked={showTodaysMoney}
            onChange={event => setShowTodaysMoney(event.target.checked)}
            style={{ flex: 'unset' }}
          >
            <Trans>Show values in today&apos;s money</Trans>
          </LabeledCheckbox>
        </View>

        {/* Headline stats */}
        <View
          style={{
            backgroundColor: theme.tableBackground,
            padding: 20,
            flexShrink: 0,
            gap: 15,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 40,
              rowGap: 20,
              alignItems: 'flex-start',
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={GROUP_HEADING_STYLE}>
                <Trans>Success rate</Trans>
              </Text>
              <Text
                style={{
                  ...styles.veryLargeText,
                  color: successColor,
                }}
              >
                <FinancialText as="span">{`${successPercent}%`}</FinancialText>
              </Text>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={GROUP_HEADING_STYLE}>
                <Trans>Median ending balance</Trans>
              </Text>
              <Text style={{ ...styles.mediumText, fontWeight: 500 }}>
                <PrivacyFilter>
                  <FinancialText as="span">
                    {format(result.medianEndingBalance, 'financial')}
                  </FinancialText>
                </PrivacyFilter>
              </Text>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={GROUP_HEADING_STYLE}>
                <Trans>Median total withdrawn</Trans>
              </Text>
              <Text style={{ ...styles.mediumText, fontWeight: 500 }}>
                <PrivacyFilter>
                  <FinancialText as="span">
                    {format(result.medianTotalWithdrawn, 'financial')}
                  </FinancialText>
                </PrivacyFilter>
              </Text>
            </View>
            <View style={{ gap: 4 }}>
              <Text style={GROUP_HEADING_STYLE}>
                <Trans>Chance of running out of money</Trans>
              </Text>
              <Text style={{ ...styles.mediumText, fontWeight: 500 }}>
                <FinancialText as="span">{`${depletionPercent}%`}</FinancialText>
              </Text>
            </View>
            {result.medianDepletionYear != null && (
              <View style={{ gap: 4 }}>
                <Text style={GROUP_HEADING_STYLE}>
                  <Trans>Typical failure runs out at</Trans>
                </Text>
                <Text style={{ ...styles.mediumText, fontWeight: 500 }}>
                  {t('Age {{age}}', {
                    // Ages here are the failure year itself, matching the
                    // drill-in's failure row
                    age: config.currentAge + result.medianDepletionYear - 1,
                  })}
                </Text>
              </View>
            )}
          </View>
          <View style={{ marginTop: 10, gap: 5 }}>
            <Text style={GROUP_HEADING_STYLE}>
              <Trans>Summary</Trans>
            </Text>
            <Text>
              {t(
                'In {{successPercent}}% of {{simulationCount}} simulated scenarios, your pot lasted until age {{endAge}}.',
                {
                  successPercent,
                  simulationCount: result.simulationCount,
                  endAge,
                },
              )}
            </Text>
          </View>
        </View>

        {/* Portfolio performance chart / simulation runs table */}
        <View
          style={{
            backgroundColor: theme.tableBackground,
            padding: 20,
            paddingBottom: resultsView === 'chart' ? 10 : 20,
            ...(resultsView === 'chart' && { height: 470 }),
            flexShrink: 0,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 10,
              flexShrink: 0,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}
            >
              <Text style={{ ...styles.mediumText, fontWeight: 600 }}>
                {resultsView === 'chart' ? (
                  <Trans>Portfolio performance</Trans>
                ) : (
                  <Trans>Simulation runs</Trans>
                )}
              </Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                <ModeButton
                  selected={resultsView === 'chart'}
                  onSelect={() => setResultsView('chart')}
                >
                  <Trans>Chart</Trans>
                </ModeButton>
                <ModeButton
                  selected={resultsView === 'runs'}
                  onSelect={() => setResultsView('runs')}
                >
                  <Trans>Runs</Trans>
                </ModeButton>
              </View>
            </View>
            {resultsView === 'chart' && (
              <Select
                value={graphView}
                onChange={value => setGraphView(value as MonteCarloGraphView)}
                options={[
                  ['all', t('All scenarios')],
                  ['single-worst', t('Single worst run')],
                  ['worst-case', t('Worst-case scenario (5th percentile)')],
                  ['pessimistic', t('Pessimistic scenario (30th percentile)')],
                  ['median', t('Median scenario (50th percentile)')],
                  ['optimistic', t('Optimistic scenario (70th percentile)')],
                ]}
                style={{ width: 280 }}
              />
            )}
          </View>
          {resultsView === 'chart' ? (
            <>
              {graphView !== 'all' && (
                <Text
                  style={{
                    color: theme.pageText,
                    marginBottom: 10,
                    flexShrink: 0,
                  }}
                >
                  {graphView === 'single-worst'
                    ? t(
                        'The unluckiest of all {{simulationCount}} simulated runs - the one that ran out of money earliest.',
                        { simulationCount: result.simulationCount },
                      )
                    : graphView === 'worst-case'
                      ? t('95% of scenarios stayed above this line.')
                      : graphView === 'pessimistic'
                        ? t('70% of scenarios stayed above this line.')
                        : graphView === 'median'
                          ? t('Half of scenarios stayed above this line.')
                          : t('30% of scenarios stayed above this line.')}
                </Text>
              )}
              <MonteCarloGraph
                percentileBands={result.percentileBands}
                startAge={config.currentAge}
                worstRunPath={result.worstRunPath}
                view={graphView}
                style={{ height: '100%', flex: 1 }}
              />
            </>
          ) : selectedRunIndex != null && runDetailRows != null ? (
            <MonteCarloRunDetailTable
              rows={runDetailRows}
              pots={resolvedConfig.pots}
              simulationIndex={selectedRunIndex}
              simulationCount={result.simulationCount}
              startAge={config.currentAge}
              hasContributions={config.contributions.length > 0}
              onBack={() => setSelectedRun(null)}
            />
          ) : (
            <MonteCarloRunsTable
              endingBalances={result.endingBalances}
              depletionYearBySimulation={result.depletionYearBySimulation}
              totalWithdrawnBySimulation={result.totalWithdrawnBySimulation}
              startAge={config.currentAge}
              onSelectRun={simulationIndex =>
                setSelectedRun({ forConfig: config, index: simulationIndex })
              }
            />
          )}
        </View>

        {/* Depletion histogram */}
        <View
          style={{
            backgroundColor: theme.tableBackground,
            padding: 20,
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              ...styles.mediumText,
              fontWeight: 600,
              marginBottom: 5,
            }}
          >
            <Trans>When did the pot run out?</Trans>
          </Text>
          {hasFailures ? (
            <>
              <Text style={{ color: theme.pageText, marginBottom: 10 }}>
                {t(
                  'Only the {{failedCount}} of {{simulationCount}} scenarios that ran out of money are shown here - the other {{survivedCount}} kept a positive balance for the full horizon.',
                  {
                    failedCount,
                    simulationCount: result.simulationCount,
                    survivedCount: result.simulationCount - failedCount,
                  },
                )}
              </Text>
              <View style={{ height: 200, flexShrink: 0 }}>
                <MonteCarloHistogram
                  depletionHistogram={result.depletionHistogram}
                  startAge={config.currentAge}
                  medianDepletionYear={result.medianDepletionYear}
                  simulationCount={result.simulationCount}
                  style={{ height: 200 }}
                />
              </View>
              <View style={{ marginTop: 10, flexShrink: 0 }}>
                <Text style={{ color: theme.pageText }}>
                  {t(
                    'Worst case: money ran out at age {{worst}}. Among failures, the typical depletion age was {{median}}; the luckiest failure lasted until age {{best}}.',
                    {
                      worst:
                        config.currentAge +
                        (result.earliestDepletionYear ?? 1) -
                        1,
                      median:
                        config.currentAge +
                        (result.medianDepletionYear ?? 1) -
                        1,
                      best:
                        config.currentAge +
                        (result.latestDepletionYear ?? 1) -
                        1,
                    },
                  )}
                </Text>
              </View>
            </>
          ) : (
            <Paragraph>
              <Trans>
                The pot survived the full time horizon in every simulated
                scenario.
              </Trans>
            </Paragraph>
          )}
        </View>

        {/* Description */}
        <View
          style={{
            backgroundColor: theme.tableBackground,
            padding: 20,
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              ...styles.mediumText,
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            <Trans>How does this simulation work?</Trans>
          </Text>
          <Paragraph>
            <Trans>
              Each scenario replays your retirement with a different sequence of
              yearly investment returns. Every year, any contributions are added
              at the start, then the withdrawal is taken, and then each pot
              grows or shrinks with that year&apos;s return. Pots with an access
              age stay invested but can&apos;t fund withdrawals until you reach
              it - if the accessible pots can&apos;t cover a year&apos;s
              withdrawal, the plan counts as having run out, even if locked pots
              still hold money. The shaded bands show the range of outcomes
              across all scenarios: the darker band covers the middle half, and
              the lighter band covers 80% of them.
            </Trans>
          </Paragraph>
          <Paragraph>
            {config.returnModel === 'normal' ? (
              <Trans>
                Keep in mind this is a simplified model: returns are drawn
                independently each year from a normal distribution, which
                ignores sequence-of-returns clustering and fat tails, and fees
                and taxes are modeled only as accurately as the rates you enter.
                Treat the results as a rough guide, not a guarantee.
              </Trans>
            ) : config.returnModel === 'historical-bootstrap' ? (
              <Trans>
                Returns are actual US market years ({{ firstYear }}&ndash;
                {{ lastYear }}, S&amp;P 500 / 10-year Treasuries / T-bills,
                Damodaran data) drawn in random order for each pot&apos;s
                allocation mix. Real crash years are included, but multi-year
                momentum is lost by shuffling, fees and taxes are only as
                accurate as the rates you enter, and US history has been
                unusually good, so results may be optimistic for globally
                diversified portfolios.
              </Trans>
            ) : (
              <Trans>
                Each scenario replays actual US market history ({{ firstYear }}
                &ndash;{{ lastYear }}, S&amp;P 500 / 10-year Treasuries /
                T-bills, Damodaran data) starting from a different year,
                wrapping around the end of the data. This preserves real crashes
                and recoveries, but there are only as many scenarios as start
                years, fees and taxes are only as accurate as the rates you
                enter, and US history may be optimistic for globally diversified
                portfolios.
              </Trans>
            )}
          </Paragraph>
        </View>
      </View>
    </Page>
  );
}
