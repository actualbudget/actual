import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  MonteCarloAllocationPreset,
  MonteCarloInvestmentTransition,
} from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import {
  getAllocationChange,
  getHistoricalMixStats,
  getMixShareTotal,
  getPotAssetWeights,
  isMixIncomplete,
  MAX_AMOUNT,
  MAX_ANNUAL_FEE_RATE,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type { MonteCarloInvestmentPhase } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import {
  FIELD_LABEL_ROW_STYLE,
  FIELD_LABEL_STYLE,
  FIELD_STYLE,
} from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { FinancialInput } from '#components/util/FinancialInput';

type MonteCarloInvestmentPhaseRowProps = {
  phase: MonteCarloInvestmentPhase;
  /** The plan's ages, bounding the from-age */
  currentAge: number;
  targetAge: number;
  /** True when a historical return model is active */
  usesHistoricalReturns: boolean;
  onPhaseChange: (changes: Partial<MonteCarloInvestmentPhase>) => void;
  onRemove: () => void;
};

/**
 * One investment phase of a pot: from a given age, the allocation (or
 * hand-typed return and volatility) and fees the pot switches or glides
 * to. Mirrors the pot row's own controls.
 */
export function MonteCarloInvestmentPhaseRow({
  phase,
  currentAge,
  targetAge,
  usesHistoricalReturns,
  onPhaseChange,
  onRemove,
}: MonteCarloInvestmentPhaseRowProps) {
  const { t } = useTranslation();

  // As on the pot row: a mix under a historical model shows its measured
  // history rather than editable assumptions
  const assetWeights = usesHistoricalReturns ? getPotAssetWeights(phase) : null;
  const historicalMixStats =
    assetWeights != null ? getHistoricalMixStats(assetWeights) : null;
  const mixIsIncomplete = isMixIncomplete(phase);

  return (
    <View
      style={{
        gap: 10,
        paddingTop: 10,
        borderTop: `1px solid ${theme.tableBorder}`,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 20,
        }}
      >
        <View style={{ width: 110 }}>
          <View style={FIELD_LABEL_ROW_STYLE}>
            <Text style={FIELD_LABEL_STYLE}>
              <Trans>From age</Trans>
            </Text>
          </View>
          <MonteCarloNumberInput
            value={phase.fromAge}
            aria-label={t('From age')}
            roundToInteger
            min={currentAge + 1}
            max={targetAge}
            step={1}
            onCommit={newValue =>
              onPhaseChange({ fromAge: newValue ?? currentAge + 1 })
            }
          />
        </View>

        <View style={{ width: 250 }}>
          <View style={FIELD_LABEL_ROW_STYLE}>
            <Text style={FIELD_LABEL_STYLE}>
              <Trans>Transition</Trans>
            </Text>
          </View>
          <Select
            value={phase.transition}
            onChange={value =>
              onPhaseChange({
                transition: value as MonteCarloInvestmentTransition,
              })
            }
            options={[
              ['at-once', t('At once')],
              ['gradual', t('Gradually from the previous phase')],
            ]}
          />
        </View>

        <View style={{ width: 210 }}>
          <View style={FIELD_LABEL_ROW_STYLE}>
            <Text style={FIELD_LABEL_STYLE}>
              <Trans>Portfolio allocation</Trans>
            </Text>
          </View>
          <Select
            value={phase.allocationPreset}
            onChange={value =>
              onPhaseChange(
                getAllocationChange(value as MonteCarloAllocationPreset, phase),
              )
            }
            options={[
              ['equity-100', t('100% stocks')],
              ['equity-80', t('80% stocks / 20% bonds')],
              ['equity-60', t('60% stocks / 40% bonds')],
              ['equity-40', t('40% stocks / 60% bonds')],
              ['cash', t('Cash / money market')],
              ['custom-mix', t('Custom mix')],
              ['custom', t('Custom')],
            ]}
          />
        </View>

        <View style={{ width: 130 }}>
          <View style={FIELD_LABEL_ROW_STYLE}>
            <Text style={FIELD_LABEL_STYLE}>
              <Trans>Expected return (%)</Trans>
            </Text>
          </View>
          {historicalMixStats != null ? (
            <Text style={{ color: theme.tableText, paddingBottom: 6 }}>
              <FinancialText as="span">
                {t('{{value}} (historical)', {
                  value: `${(historicalMixStats.mean * 100).toFixed(1)}%`,
                })}
              </FinancialText>
            </Text>
          ) : (
            <MonteCarloNumberInput
              value={phase.expectedReturnMean}
              aria-label={t('Expected return (%)')}
              scale={100}
              min={-100}
              max={100}
              onCommit={newValue =>
                onPhaseChange({
                  expectedReturnMean: newValue ?? 0,
                  allocationPreset:
                    phase.allocationPreset === 'custom-mix'
                      ? 'custom-mix'
                      : 'custom',
                })
              }
            />
          )}
        </View>

        <View style={{ width: 130 }}>
          <View style={FIELD_LABEL_ROW_STYLE}>
            <Text style={FIELD_LABEL_STYLE}>
              <Trans>Volatility (%)</Trans>
            </Text>
          </View>
          {historicalMixStats != null ? (
            <Text style={{ color: theme.tableText, paddingBottom: 6 }}>
              <FinancialText as="span">
                {t('{{value}} (historical)', {
                  value: `${(historicalMixStats.stdDev * 100).toFixed(1)}%`,
                })}
              </FinancialText>
            </Text>
          ) : (
            <MonteCarloNumberInput
              value={phase.returnStdDev}
              aria-label={t('Volatility (std dev %)')}
              scale={100}
              min={0}
              max={100}
              onCommit={newValue =>
                onPhaseChange({
                  returnStdDev: newValue ?? 0,
                  allocationPreset:
                    phase.allocationPreset === 'custom-mix'
                      ? 'custom-mix'
                      : 'custom',
                })
              }
            />
          )}
        </View>

        <View style={{ width: 140 }}>
          <View style={FIELD_LABEL_ROW_STYLE}>
            <Text style={FIELD_LABEL_STYLE}>
              <Trans>Fixed yearly fee</Trans>
            </Text>
          </View>
          <FinancialInput
            value={phase.annualFeeFixed}
            onUpdate={value =>
              onPhaseChange({
                annualFeeFixed: Math.min(MAX_AMOUNT, Math.max(0, value)),
              })
            }
          />
        </View>

        <LabeledCheckbox
          id={`investment-phase-fee-inflation-${phase.id}`}
          checked={phase.feeAdjustsWithInflation}
          onChange={event =>
            onPhaseChange({ feeAdjustsWithInflation: event.target.checked })
          }
          style={{ flex: 'unset', paddingBottom: 6 }}
        >
          <Trans>Adjust by inflation</Trans>
        </LabeledCheckbox>

        <View style={{ width: 130 }}>
          <View style={FIELD_LABEL_ROW_STYLE}>
            <Text style={FIELD_LABEL_STYLE}>
              <Trans>Fee (% of balance)</Trans>
            </Text>
          </View>
          <MonteCarloNumberInput
            value={phase.annualFeeRate}
            aria-label={t('Fee (% of balance)')}
            scale={100}
            min={0}
            max={MAX_ANNUAL_FEE_RATE * 100}
            step={0.01}
            onCommit={newValue =>
              onPhaseChange({ annualFeeRate: newValue ?? 0 })
            }
          />
        </View>

        <Button
          variant="bare"
          aria-label={t('Remove investment phase')}
          onPress={onRemove}
          style={{ padding: 6, marginBottom: 2 }}
        >
          <SvgDelete width={10} height={10} />
        </Button>
      </View>

      {phase.allocationPreset === 'custom-mix' && (
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              gap: 20,
            }}
          >
            <View style={FIELD_STYLE}>
              <View style={FIELD_LABEL_ROW_STYLE}>
                <Text style={FIELD_LABEL_STYLE}>
                  <Trans>Stocks (%)</Trans>
                </Text>
              </View>
              <MonteCarloNumberInput
                value={phase.allocationStocks}
                aria-label={t('Stocks (%)')}
                scale={100}
                min={0}
                max={100}
                onCommit={newValue =>
                  onPhaseChange({ allocationStocks: newValue ?? 0 })
                }
              />
            </View>
            <View style={FIELD_STYLE}>
              <View style={FIELD_LABEL_ROW_STYLE}>
                <Text style={FIELD_LABEL_STYLE}>
                  <Trans>Bonds (%)</Trans>
                </Text>
              </View>
              <MonteCarloNumberInput
                value={phase.allocationBonds}
                aria-label={t('Bonds (%)')}
                scale={100}
                min={0}
                max={100}
                onCommit={newValue =>
                  onPhaseChange({ allocationBonds: newValue ?? 0 })
                }
              />
            </View>
            <View style={FIELD_STYLE}>
              <View style={FIELD_LABEL_ROW_STYLE}>
                <Text style={FIELD_LABEL_STYLE}>
                  <Trans>Cash (%)</Trans>
                </Text>
              </View>
              <MonteCarloNumberInput
                value={phase.allocationCash}
                aria-label={t('Cash (%)')}
                scale={100}
                min={0}
                max={100}
                onCommit={newValue =>
                  onPhaseChange({ allocationCash: newValue ?? 0 })
                }
              />
            </View>
          </View>
          {mixIsIncomplete && (
            <Text style={{ color: theme.errorText }}>
              <Trans>
                The allocation must total 100% - currently{' '}
                {{
                  total: `${parseFloat((getMixShareTotal(phase) * 100).toFixed(2))}%`,
                }}
                . Until it does, this phase uses its expected return and
                volatility instead of the mix.
              </Trans>
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
