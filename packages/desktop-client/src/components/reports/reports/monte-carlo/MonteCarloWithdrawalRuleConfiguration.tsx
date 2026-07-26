import { Trans, useTranslation } from 'react-i18next';

import { SvgQuestion } from '@actual-app/components/icons/v1';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import type { MonteCarloWithdrawalRuleType } from '@actual-app/core/types/models';

import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import {
  FIELD_LABEL_ROW_STYLE,
  FIELD_LABEL_STYLE,
  FIELD_STYLE,
} from '#components/reports/reports/monte-carlo/MonteCarloPotConfiguration';
import { MAX_AMOUNT } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type { MonteCarloWithdrawalRuleConfig } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { FinancialInput } from '#components/util/FinancialInput';

const SENTENCE_STYLE = {
  color: theme.pageText,
  // Room for the inline inputs without cramped line wrapping
  lineHeight: 2.6,
} as const;

const INLINE_INPUT_STYLE = {
  width: 70,
  display: 'inline-block',
  textAlign: 'center',
  margin: '0 6px',
} as const;

type MonteCarloWithdrawalRuleConfigurationProps = {
  rule: MonteCarloWithdrawalRuleConfig;
  minimumWithdrawal: number;
  onRuleChange: (changes: Partial<MonteCarloWithdrawalRuleConfig>) => void;
  onMinimumWithdrawalChange: (value: number) => void;
};

export function MonteCarloWithdrawalRuleConfiguration({
  rule,
  minimumWithdrawal,
  onRuleChange,
  onMinimumWithdrawalChange,
}: MonteCarloWithdrawalRuleConfigurationProps) {
  const { t } = useTranslation();

  return (
    <View style={{ marginTop: 20, gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
        <View style={{ width: 250 }}>
          <View style={FIELD_LABEL_ROW_STYLE}>
            <Text style={FIELD_LABEL_STYLE}>
              <Trans>Withdrawal rule</Trans>
            </Text>
            <Tooltip
              content={
                <View style={{ maxWidth: 300 }}>
                  <Text>
                    <Trans>
                      Dynamic strategies that adjust your withdrawal each year
                      based on how the pots are doing, instead of blindly taking
                      the same inflation-adjusted amount.
                    </Trans>
                  </Text>
                </View>
              }
              placement="bottom start"
              style={{ ...styles.tooltip }}
            >
              <SvgQuestion height={12} width={12} cursor="pointer" />
            </Tooltip>
          </View>
          <Select
            value={rule.type}
            onChange={value =>
              onRuleChange({ type: value as MonteCarloWithdrawalRuleType })
            }
            options={[
              ['none', t('None (fixed withdrawals)')],
              ['guardrails', t('Guardrails (Guyton-Klinger)')],
              ['ratcheting', t('Ratcheting (Kitces)')],
              ['floor-ceiling', t('Floor & ceiling (Bengen)')],
              ['boundaries', t('Boundaries')],
            ]}
          />
        </View>

        {rule.type !== 'none' && (
          <View style={FIELD_STYLE}>
            <View style={FIELD_LABEL_ROW_STYLE}>
              <Text style={FIELD_LABEL_STYLE}>
                <Trans>Minimum withdrawal</Trans>
              </Text>
              <Tooltip
                content={
                  <View style={{ maxWidth: 300 }}>
                    <Text>
                      <Trans>
                        The annual withdrawal never drops below this amount, no
                        matter what the rule says. Like your planned spending,
                        it&apos;s in today&apos;s money and rises with
                        inflation. Set to 0 for no floor.
                      </Trans>
                    </Text>
                  </View>
                }
                placement="bottom start"
                style={{ ...styles.tooltip }}
              >
                <SvgQuestion height={12} width={12} cursor="pointer" />
              </Tooltip>
            </View>
            <FinancialInput
              value={minimumWithdrawal}
              onUpdate={value =>
                onMinimumWithdrawalChange(
                  Math.min(MAX_AMOUNT, Math.max(0, value)),
                )
              }
            />
          </View>
        )}
      </View>

      {rule.type === 'guardrails' && (
        <View>
          <Text style={SENTENCE_STYLE}>
            <Trans>
              If the withdrawal rate rises more than
              <MonteCarloNumberInput
                value={rule.preservationTriggerPct}
                scale={100}
                min={0}
                max={100}
                style={INLINE_INPUT_STYLE}
                onCommit={newValue =>
                  onRuleChange({ preservationTriggerPct: newValue ?? 0 })
                }
              />
              % above the planned rate, cut withdrawals by
              <MonteCarloNumberInput
                value={rule.preservationCutPct}
                scale={100}
                min={0}
                max={100}
                style={INLINE_INPUT_STYLE}
                onCommit={newValue =>
                  onRuleChange({ preservationCutPct: newValue ?? 0 })
                }
              />
              %.
            </Trans>
          </Text>
          <Text style={SENTENCE_STYLE}>
            <Trans>
              If it falls more than
              <MonteCarloNumberInput
                value={rule.prosperityTriggerPct}
                scale={100}
                min={0}
                max={100}
                style={INLINE_INPUT_STYLE}
                onCommit={newValue =>
                  onRuleChange({ prosperityTriggerPct: newValue ?? 0 })
                }
              />
              % below the planned rate, raise withdrawals by
              <MonteCarloNumberInput
                value={rule.prosperityIncreasePct}
                scale={100}
                min={0}
                max={100}
                style={INLINE_INPUT_STYLE}
                onCommit={newValue =>
                  onRuleChange({ prosperityIncreasePct: newValue ?? 0 })
                }
              />
              %.
            </Trans>
          </Text>
        </View>
      )}

      {rule.type === 'ratcheting' && (
        <Text style={SENTENCE_STYLE}>
          <Trans>
            If the accessible balance stays above
            <MonteCarloNumberInput
              value={rule.balanceThresholdMultiple}
              min={1}
              max={10}
              step={0.1}
              style={INLINE_INPUT_STYLE}
              onCommit={newValue =>
                onRuleChange({ balanceThresholdMultiple: newValue ?? 1.5 })
              }
            />
            times its starting level for
            <MonteCarloNumberInput
              value={rule.consecutiveYears}
              roundToInteger
              min={1}
              max={30}
              step={1}
              style={INLINE_INPUT_STYLE}
              onCommit={newValue =>
                onRuleChange({ consecutiveYears: newValue ?? 1 })
              }
            />
            years in a row, raise withdrawals by
            <MonteCarloNumberInput
              value={rule.ratchetIncreasePct}
              scale={100}
              min={0}
              max={100}
              style={INLINE_INPUT_STYLE}
              onCommit={newValue =>
                onRuleChange({ ratchetIncreasePct: newValue ?? 0 })
              }
            />
            %.
          </Trans>
        </Text>
      )}

      {rule.type === 'floor-ceiling' && (
        <Text style={SENTENCE_STYLE}>
          <Trans>
            Each year, withdraw the starting rate&apos;s share of the current
            accessible balance, but never more than
            <MonteCarloNumberInput
              value={rule.ceilingPct}
              scale={100}
              min={0}
              max={200}
              style={INLINE_INPUT_STYLE}
              onCommit={newValue => onRuleChange({ ceilingPct: newValue ?? 0 })}
            />
            % above or
            <MonteCarloNumberInput
              value={rule.floorPct}
              scale={100}
              min={0}
              max={100}
              style={INLINE_INPUT_STYLE}
              onCommit={newValue => onRuleChange({ floorPct: newValue ?? 0 })}
            />
            % below the planned amount.
          </Trans>
        </Text>
      )}

      {rule.type === 'boundaries' && (
        <View>
          <Text style={SENTENCE_STYLE}>
            <Trans>
              If the withdrawal rate rises above
              <MonteCarloNumberInput
                value={rule.upperRateThreshold}
                scale={100}
                min={0}
                max={100}
                style={INLINE_INPUT_STYLE}
                onCommit={newValue =>
                  onRuleChange({ upperRateThreshold: newValue ?? 0 })
                }
              />
              %, cut withdrawals by
              <MonteCarloNumberInput
                value={rule.upperCutPct}
                scale={100}
                min={0}
                max={100}
                style={INLINE_INPUT_STYLE}
                onCommit={newValue =>
                  onRuleChange({ upperCutPct: newValue ?? 0 })
                }
              />
              %.
            </Trans>
          </Text>
          <Text style={SENTENCE_STYLE}>
            <Trans>
              If it falls below
              <MonteCarloNumberInput
                value={rule.lowerRateThreshold}
                scale={100}
                min={0}
                max={100}
                style={INLINE_INPUT_STYLE}
                onCommit={newValue =>
                  onRuleChange({ lowerRateThreshold: newValue ?? 0 })
                }
              />
              %, raise withdrawals by
              <MonteCarloNumberInput
                value={rule.lowerIncreasePct}
                scale={100}
                min={0}
                max={100}
                style={INLINE_INPUT_STYLE}
                onCommit={newValue =>
                  onRuleChange({ lowerIncreasePct: newValue ?? 0 })
                }
              />
              %.
            </Trans>
          </Text>
        </View>
      )}

      {rule.type !== 'none' && (
        <Text style={{ color: theme.pageText, fontSize: 13 }}>
          {rule.type === 'guardrails'
            ? t(
                'A deliberate spending-phase change is not counted as drift. The rule adjusts your planned spending year by year, independently in every scenario, and only looks at the pots you can currently access - locked pots count from the moment they unlock.',
              )
            : t(
                'The rule adjusts your planned spending year by year, independently in every scenario, and only looks at the pots you can currently access - locked pots count from the moment they unlock.',
              )}
        </Text>
      )}
    </View>
  );
}
