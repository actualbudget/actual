import { useState } from 'react';
import type { DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { ModeButton } from '@actual-app/components/mode-button';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  MonteCarloReturnModel,
  MonteCarloWithdrawalStrategy,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';
import { v4 as uuidv4 } from 'uuid';

import { MonteCarloContributions } from '#components/reports/reports/monte-carlo/MonteCarloContributions';
import { MonteCarloHelpTooltip } from '#components/reports/reports/monte-carlo/MonteCarloHelpTooltip';
import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import { MonteCarloPotConfiguration } from '#components/reports/reports/monte-carlo/MonteCarloPotConfiguration';
import { MonteCarloPotsTableHeader } from '#components/reports/reports/monte-carlo/MonteCarloPotsTableHeader';
import {
  createMonteCarloPot,
  MAX_SIMULATION_COUNT,
  MIN_SIMULATION_COUNT,
  MONTE_CARLO_DEFAULTS,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloConfig,
  MonteCarloPot,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { MonteCarloSpendingPhases } from '#components/reports/reports/monte-carlo/MonteCarloSpendingPhases';
import {
  FIELD_LABEL_ROW_STYLE,
  FIELD_LABEL_STYLE,
  FIELD_STYLE,
  GROUP_HEADING_STYLE,
} from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { MonteCarloTaxConfiguration } from '#components/reports/reports/monte-carlo/MonteCarloTaxConfiguration';
import { MonteCarloWithdrawalRuleConfiguration } from '#components/reports/reports/monte-carlo/MonteCarloWithdrawalRuleConfiguration';

type ConfigurationTab =
  | 'plan'
  | 'pots'
  | 'contributions'
  | 'withdrawals'
  | 'tax';

const PLAN_GROUP_FIELDS_STYLE = {
  flexDirection: 'row',
  gap: 20,
  alignItems: 'flex-end',
} as const;

type MonteCarloConfigurationProps = {
  config: MonteCarloConfig;
  onConfigChange: (changes: Partial<MonteCarloConfig>) => void;
};

export function MonteCarloConfiguration({
  config,
  onConfigChange,
}: MonteCarloConfigurationProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ConfigurationTab>('plan');

  function onPotChange(potId: string, changes: Partial<MonteCarloPot>) {
    onConfigChange({
      pots: config.pots.map(pot =>
        pot.id === potId ? { ...pot, ...changes } : pot,
      ),
    });
  }

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(key => ({ 'text/plain': String(key) }) as DragItem),
    renderDropIndicator: target => (
      <DropIndicator
        target={target}
        className={css({
          '&[data-drop-target]': {
            height: 4,
            backgroundColor: theme.tableBorderSeparator,
            opacity: 1,
            borderRadius: 4,
          },
        })}
      />
    ),
    onReorder: event => {
      const [movedKey] = event.keys;
      const fromIndex = config.pots.findIndex(pot => pot.id === movedKey);
      const targetIndex = config.pots.findIndex(
        pot => pot.id === event.target.key,
      );
      if (fromIndex === -1 || targetIndex === -1) {
        return;
      }

      const newPots = [...config.pots];
      const [movedPot] = newPots.splice(fromIndex, 1);
      let insertIndex =
        targetIndex + (event.target.dropPosition === 'after' ? 1 : 0);
      if (fromIndex < insertIndex) {
        insertIndex -= 1;
      }
      newPots.splice(insertIndex, 0, movedPot);
      onConfigChange({ pots: newPots });
    },
  });

  return (
    <View
      style={{
        backgroundColor: theme.tableBackground,
        padding: 20,
        flexShrink: 0,
        gap: 15,
      }}
    >
      {/* Tab bar; wraps onto extra lines on narrow screens */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        <ModeButton
          selected={activeTab === 'plan'}
          onSelect={() => setActiveTab('plan')}
        >
          <Trans>Plan details</Trans>
        </ModeButton>
        <ModeButton
          selected={activeTab === 'pots'}
          onSelect={() => setActiveTab('pots')}
        >
          <Trans>Investment pots</Trans>
        </ModeButton>
        <ModeButton
          selected={activeTab === 'contributions'}
          onSelect={() => setActiveTab('contributions')}
        >
          <Trans>Contributions</Trans>
        </ModeButton>
        <ModeButton
          selected={activeTab === 'withdrawals'}
          onSelect={() => setActiveTab('withdrawals')}
        >
          <Trans>Spending</Trans>
        </ModeButton>
        <ModeButton
          selected={activeTab === 'tax'}
          onSelect={() => setActiveTab('tax')}
        >
          <Trans>Tax</Trans>
        </ModeButton>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: theme.pageText }}>
          {activeTab === 'plan'
            ? t(
                'Who this plan is for and how the simulation generates market returns.',
              )
            : activeTab === 'pots'
              ? t(
                  'The invested accounts your plan draws from - each with its own balance, allocation, and return assumptions. Drag rows to reorder pots; expand a row for access, tax and fee settings.',
                )
              : activeTab === 'contributions'
                ? t(
                    "Money you add to your pots each year, in today's money - for example pension or savings deposits while you're still earning.",
                  )
                : activeTab === 'withdrawals'
                  ? t(
                      'How much you take out each year, and optional rules that adjust it as markets move.',
                    )
                  : t(
                      'How withdrawals are taxed - your spending is what you keep after tax.',
                    )}
        </Text>
        {activeTab === 'contributions' && (
          <MonteCarloHelpTooltip>
            <Trans>
              Each contribution is paid in at the start of every year in its age
              window (both ages inclusive), so it earns that year&apos;s return.
              Leave the ages blank for &ldquo;now&rdquo; and &ldquo;the end of
              the plan&rdquo;. Tick Adjust by inflation to keep the
              amount&apos;s buying power constant; untick it for a fixed amount
              that shrinks in real terms. A pot can receive any number of
              contributions - even one that is still locked for withdrawals.
            </Trans>
          </MonteCarloHelpTooltip>
        )}
      </View>

      {/* Plan details */}
      {activeTab === 'plan' && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            rowGap: 20,
            columnGap: 40,
          }}
        >
          <View style={{ gap: 10 }}>
            <Text style={GROUP_HEADING_STYLE}>
              <Trans>Your plan</Trans>
            </Text>
            <View style={PLAN_GROUP_FIELDS_STYLE}>
              <View style={FIELD_STYLE}>
                <View style={FIELD_LABEL_ROW_STYLE}>
                  <Text style={FIELD_LABEL_STYLE}>
                    <Trans>Your current age</Trans>
                  </Text>
                </View>
                <MonteCarloNumberInput
                  value={config.currentAge}
                  aria-label={t('Your current age')}
                  roundToInteger
                  min={16}
                  max={119}
                  step={1}
                  onCommit={newValue =>
                    onConfigChange({
                      currentAge: newValue ?? MONTE_CARLO_DEFAULTS.currentAge,
                    })
                  }
                />
              </View>

              <View style={FIELD_STYLE}>
                <View style={FIELD_LABEL_ROW_STYLE}>
                  <Text style={FIELD_LABEL_STYLE}>
                    <Trans>Pot must last until age</Trans>
                  </Text>
                </View>
                <MonteCarloNumberInput
                  value={config.targetAge}
                  aria-label={t('Pot must last until age')}
                  roundToInteger
                  min={config.currentAge + 1}
                  max={120}
                  step={1}
                  onCommit={newValue =>
                    onConfigChange({
                      targetAge: newValue ?? MONTE_CARLO_DEFAULTS.targetAge,
                    })
                  }
                />
              </View>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={GROUP_HEADING_STYLE}>
              <Trans>Inflation</Trans>
            </Text>
            <View style={PLAN_GROUP_FIELDS_STYLE}>
              <View style={FIELD_STYLE}>
                <View style={FIELD_LABEL_ROW_STYLE}>
                  <Text style={FIELD_LABEL_STYLE}>
                    <Trans>Mean (%)</Trans>
                  </Text>
                  <MonteCarloHelpTooltip>
                    <Trans>
                      The average yearly rise in prices. When set, your planned
                      spending grows with it so your spending power is
                      maintained.
                      <br />
                      <br />
                      Leave blank to keep withdrawals flat.
                    </Trans>
                  </MonteCarloHelpTooltip>
                </View>
                <MonteCarloNumberInput
                  value={config.inflationMean}
                  aria-label={t('Inflation mean (%)')}
                  scale={100}
                  allowEmpty
                  min={0}
                  max={100}
                  placeholder={t('None')}
                  onCommit={newValue =>
                    onConfigChange({ inflationMean: newValue })
                  }
                />
              </View>

              <View style={FIELD_STYLE}>
                <View style={FIELD_LABEL_ROW_STYLE}>
                  <Text style={FIELD_LABEL_STYLE}>
                    <Trans>Std dev (%)</Trans>
                  </Text>
                  <MonteCarloHelpTooltip>
                    <Trans>
                      Real-world inflation bounces around from year to year
                      rather than staying fixed. When set, each simulated year
                      draws its own inflation rate around the mean.
                      <br />
                      <br />
                      Around 2% matches how much US inflation has varied in
                      recent decades. Set to 0 to use the fixed mean rate every
                      year.
                    </Trans>
                  </MonteCarloHelpTooltip>
                </View>
                <MonteCarloNumberInput
                  value={config.inflationStdDev}
                  aria-label={t('Inflation std dev (%)')}
                  scale={100}
                  min={0}
                  max={50}
                  disabled={config.inflationMean == null}
                  onCommit={newValue =>
                    onConfigChange({ inflationStdDev: newValue ?? 0 })
                  }
                />
              </View>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={GROUP_HEADING_STYLE}>
              <Trans>Simulation</Trans>
            </Text>
            <View style={PLAN_GROUP_FIELDS_STYLE}>
              <View style={{ width: 250 }}>
                <View style={FIELD_LABEL_ROW_STYLE}>
                  <Text style={FIELD_LABEL_STYLE}>
                    <Trans>Return model</Trans>
                  </Text>
                  <MonteCarloHelpTooltip>
                    <Trans>
                      How each simulated year&apos;s investment return is
                      generated.
                      <br />
                      <br />
                      Random: drawn from a normal distribution around each
                      pot&apos;s expected return and volatility. All pots
                      experience the same market conditions each year, scaled by
                      their own volatility.
                      <br />
                      <br />
                      Historical, shuffled: drawn from actual US market years
                      (1928 onwards) in random order.
                      <br />
                      <br />
                      Historical sequences: replays real market history, one
                      scenario per starting year. Pots with a Custom allocation
                      always use their own return and volatility.
                    </Trans>
                  </MonteCarloHelpTooltip>
                </View>
                <Select
                  value={config.returnModel}
                  onChange={value =>
                    onConfigChange({
                      returnModel: value as MonteCarloReturnModel,
                    })
                  }
                  options={[
                    ['normal', t('Random (normal distribution)')],
                    ['historical-bootstrap', t('Historical returns, shuffled')],
                    ['historical-sequence', t('Historical sequences (replay)')],
                  ]}
                />
              </View>

              <View style={FIELD_STYLE}>
                <View style={FIELD_LABEL_ROW_STYLE}>
                  <Text style={FIELD_LABEL_STYLE}>
                    <Trans>Simulations</Trans>
                  </Text>
                  <MonteCarloHelpTooltip>
                    <Trans>
                      How many random scenarios to run. More simulations give a
                      steadier result but take slightly longer.
                    </Trans>
                  </MonteCarloHelpTooltip>
                </View>
                <MonteCarloNumberInput
                  value={config.simulationCount}
                  aria-label={t('Simulations')}
                  roundToInteger
                  min={MIN_SIMULATION_COUNT}
                  max={MAX_SIMULATION_COUNT}
                  step={500}
                  // Sequence replay runs one scenario per historical start year
                  disabled={config.returnModel === 'historical-sequence'}
                  onCommit={newValue =>
                    onConfigChange({
                      simulationCount: newValue ?? MIN_SIMULATION_COUNT,
                    })
                  }
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Investment pots. Future settings like fees belong in their own
          tab alongside these. */}
      {activeTab === 'pots' && (
        <View>
          <View
            style={{
              ...styles.tableContainer,
              ...styles.horizontalScrollbar,
              flex: 'unset',
              // Scroll sideways when the columns' minimum widths don't fit,
              // instead of clipping the end of the rows
              overflowX: 'auto',
            }}
          >
            <View style={{ minWidth: 'fit-content' }}>
              <MonteCarloPotsTableHeader />
              <GridList
                aria-label={t('Investment pots')}
                // Without this, typing in the pot fields moves the list
                // highlight to whichever pot name matches the keystroke
                disallowTypeAhead
                // Let Tab move between the fields inside pot rows instead of
                // jumping out of the list (default ARIA grid behavior)
                keyboardNavigationBehavior="tab"
                items={config.pots}
                dependencies={[config, onConfigChange]}
                dragAndDropHooks={dragAndDropHooks}
              >
                {pot => (
                  <MonteCarloPotConfiguration
                    key={pot.id}
                    pot={pot}
                    potNumber={config.pots.indexOf(pot) + 1}
                    canRemove={config.pots.length > 1}
                    usesHistoricalReturns={config.returnModel !== 'normal'}
                    usesTaxBands={config.taxModel === 'bands'}
                    onPotChange={changes => onPotChange(pot.id, changes)}
                    onRemove={() =>
                      onConfigChange({
                        pots: config.pots.filter(other => other.id !== pot.id),
                        // A removed pot takes its contributions with it
                        contributions: config.contributions.filter(
                          contribution => contribution.potId !== pot.id,
                        ),
                      })
                    }
                  />
                )}
              </GridList>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Button
              onPress={() =>
                onConfigChange({
                  pots: [...config.pots, createMonteCarloPot(uuidv4())],
                })
              }
            >
              <SvgAdd width={10} height={10} style={{ marginRight: 5 }} />
              <Trans>Add pot</Trans>
            </Button>
          </View>
        </View>
      )}

      {/* Contributions */}
      {activeTab === 'contributions' && (
        <MonteCarloContributions
          contributions={config.contributions}
          pots={config.pots}
          currentAge={config.currentAge}
          targetAge={config.targetAge}
          onConfigChange={onConfigChange}
        />
      )}

      {/* Spending */}
      {activeTab === 'withdrawals' && (
        <View>
          <MonteCarloSpendingPhases
            phases={config.spendingPhases}
            currentAge={config.currentAge}
            targetAge={config.targetAge}
            onPhasesChange={phases =>
              onConfigChange({ spendingPhases: phases })
            }
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
            <View style={{ width: 220 }}>
              <View style={FIELD_LABEL_ROW_STYLE}>
                <Text style={FIELD_LABEL_STYLE}>
                  <Trans>Withdrawal order</Trans>
                </Text>
                <MonteCarloHelpTooltip>
                  <Trans>
                    How the annual withdrawal is taken when you have more than
                    one pot.
                    <br />
                    <br />
                    Proportionally: split across pots based on their current
                    balances.
                    <br />
                    <br />
                    In pot order: drain the first pot before touching the next,
                    in the order listed on the Investment pots tab.
                    <br />
                    <br />
                    Best performer first: each year, drain the pot with the
                    highest return last year - e.g. spend cash after a stock
                    crash so the crashed pot can recover, and spend stocks in
                    boom years. The first year uses the listed order.
                    <br />
                    <br />
                    Keep pots at their target mix: withdrawals come from
                    whichever pots have grown above their share of your starting
                    mix, pulling the portfolio back toward it - trim stocks
                    after a boom, spend cash and bonds after a crash.
                    <br />
                    <br />
                    Pots that haven&apos;t reached their access age yet are
                    skipped until they unlock.
                  </Trans>
                </MonteCarloHelpTooltip>
              </View>
              <Select
                value={config.withdrawalStrategy}
                onChange={value =>
                  onConfigChange({
                    withdrawalStrategy: value as MonteCarloWithdrawalStrategy,
                  })
                }
                options={[
                  ['proportional', t('Split proportionally across pots')],
                  ['sequential', t('Drain pots in order')],
                  ['best-performer', t('Spend from the best performer first')],
                  ['target-mix', t('Keep pots at their target mix')],
                ]}
              />
            </View>
          </View>
          <MonteCarloWithdrawalRuleConfiguration
            rule={config.withdrawalRule}
            minimumWithdrawal={config.minimumWithdrawal}
            onRuleChange={changes =>
              onConfigChange({
                withdrawalRule: { ...config.withdrawalRule, ...changes },
              })
            }
            onMinimumWithdrawalChange={value =>
              onConfigChange({ minimumWithdrawal: value })
            }
          />
        </View>
      )}

      {/* Tax */}
      {activeTab === 'tax' && (
        <MonteCarloTaxConfiguration
          taxModel={config.taxModel}
          taxBands={config.taxBands}
          onConfigChange={onConfigChange}
        />
      )}
    </View>
  );
}
