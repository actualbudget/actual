import { Fragment } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import type { SelectOption } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { v4 as uuidv4 } from 'uuid';

import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { MonteCarloHelpTooltip } from '#components/reports/reports/monte-carlo/MonteCarloHelpTooltip';
import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import {
  createMonteCarloLumpSum,
  getMonteCarloPotLabel,
  MAX_AMOUNT,
  MAX_WITHDRAWAL_TAX_RATE,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloConfig,
  MonteCarloLumpSum,
  MonteCarloPot,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { FIELD_LABEL_STYLE } from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { Field, Row, TableHeader } from '#components/table';
import { FinancialInput } from '#components/util/FinancialInput';

const LUMP_SUM_ROW_HEIGHT = 43;

/** The Select value for a lump sum that follows the withdrawal order */
const WITHDRAWAL_ORDER_SOURCE = '';

type MonteCarloLumpSumsProps = {
  lumpSums: MonteCarloLumpSum[];
  pots: MonteCarloPot[];
  /** True when the bands tax model is active */
  usesTaxBands: boolean;
  currentAge: number;
  targetAge: number;
  onConfigChange: (changes: Partial<MonteCarloConfig>) => void;
};

export function MonteCarloLumpSums({
  lumpSums,
  pots,
  usesTaxBands,
  currentAge,
  targetAge,
  onConfigChange,
}: MonteCarloLumpSumsProps) {
  const { t } = useTranslation();

  function updateLumpSum(
    lumpSumId: string,
    changes: Partial<MonteCarloLumpSum>,
  ) {
    onConfigChange({
      lumpSums: lumpSums.map(lumpSum =>
        lumpSum.id === lumpSumId ? { ...lumpSum, ...changes } : lumpSum,
      ),
    });
  }

  function removeLumpSum(lumpSumId: string) {
    onConfigChange({
      lumpSums: lumpSums.filter(lumpSum => lumpSum.id !== lumpSumId),
    });
  }

  // The plan's last simulated year is the one before the target age
  const lastAge = targetAge - 1;

  function addLumpSum() {
    // A few years out by default, so it lands inside the plan without
    // sitting on the current year
    const age = Math.min(lastAge, currentAge + 5);
    onConfigChange({
      lumpSums: [...lumpSums, createMonteCarloLumpSum(uuidv4(), age)],
    });
  }

  // The surplus pot is drawn first by the order anyway, so it isn't
  // offered as a named source
  const sourceOptions: SelectOption[] = [
    [WITHDRAWAL_ORDER_SOURCE, t('Follow the withdrawal order')],
    ...pots.flatMap((pot, potIndex) =>
      pot.isSurplus
        ? []
        : [
            [pot.id, getMonteCarloPotLabel(pots, potIndex, t)] satisfies [
              string,
              string,
            ],
          ],
    ),
  ];

  return (
    <View style={{ gap: 10, marginTop: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={FIELD_LABEL_STYLE}>
          <Trans>One-off withdrawals</Trans>
        </Text>
        <MonteCarloHelpTooltip>
          <Trans>
            A single withdrawal at an age, on top of that year&apos;s spending -
            a house deposit, a car, a pension&apos;s tax-free lump sum. The
            amount is what you receive after tax, in today&apos;s money, and
            each one has its own tax setting rather than the pot&apos;s.
            <br />
            <br />
            The withdrawal rule and the minimum spending never adjust it, but
            your pots are smaller afterwards, so a rule may react in later
            years. A lump sum the accessible pots can&apos;t fund fails the
            plan, like unfunded spending.
          </Trans>
        </MonteCarloHelpTooltip>
      </View>

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
          <TableHeader>
            <Field width="flex" style={{ minWidth: 150 }}>
              <Trans>Name</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: 90 }}>
              <Trans>Age</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: 140 }}>
              <Trans>Amount (after tax)</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: 190 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                }}
              >
                <Text>
                  <Trans>Taken from</Trans>
                </Text>
                <MonteCarloHelpTooltip>
                  <Trans>
                    The pot the money comes out of first. If that pot can&apos;t
                    cover the whole amount, or hasn&apos;t reached its access
                    age yet, the rest follows your withdrawal order. Follow the
                    withdrawal order takes all of it that way.
                  </Trans>
                </MonteCarloHelpTooltip>
              </View>
            </Field>
            <Field width="flex" style={{ minWidth: 130 }}>
              {usesTaxBands ? (
                <Trans>Taxable portion (%)</Trans>
              ) : (
                <Trans>Tax (%)</Trans>
              )}
            </Field>
            <Field width="flex" style={{ minWidth: 170 }}>
              <Trans>Inflation</Trans>
            </Field>
            <Field width={36} />
          </TableHeader>

          {lumpSums.map((lumpSum, index) => {
            const sourcePot = pots.find(pot => pot.id === lumpSum.sourcePotId);
            const sourceIsLocked =
              sourcePot?.accessAge != null && sourcePot.accessAge > lumpSum.age;
            // A source that is no longer offered (removed, or now the
            // surplus pot) is what the simulation does with it: the order
            const sourceValue =
              sourcePot != null && !sourcePot.isSurplus
                ? sourcePot.id
                : WITHDRAWAL_ORDER_SOURCE;
            // Ages can drift outside the plan when the current or target
            // age changes; those are never simulated
            const isOutsidePlan =
              lumpSum.age < currentAge || lumpSum.age > lastAge;
            return (
              <Fragment key={lumpSum.id}>
                <Row
                  collapsed
                  height={LUMP_SUM_ROW_HEIGHT}
                  style={{
                    backgroundColor: theme.tableBackground,
                    ':hover': {
                      backgroundColor: theme.tableRowBackgroundHover,
                    },
                  }}
                >
                  <Field
                    width="flex"
                    style={{ minWidth: 150 }}
                    truncate={false}
                  >
                    <Input
                      defaultValue={lumpSum.name}
                      placeholder={t('One-off {{number}}', {
                        number: index + 1,
                      })}
                      aria-label={t('One-off withdrawal name')}
                      onUpdate={newName => {
                        if (newName !== lumpSum.name) {
                          updateLumpSum(lumpSum.id, { name: newName });
                        }
                      }}
                    />
                  </Field>

                  <Field width="flex" style={{ minWidth: 90 }} truncate={false}>
                    <MonteCarloNumberInput
                      value={lumpSum.age}
                      aria-label={t('Age')}
                      roundToInteger
                      min={currentAge}
                      max={lastAge}
                      step={1}
                      onCommit={newValue =>
                        updateLumpSum(lumpSum.id, {
                          age: newValue ?? currentAge,
                        })
                      }
                    />
                  </Field>

                  <Field
                    width="flex"
                    style={{ minWidth: 140 }}
                    truncate={false}
                  >
                    <FinancialInput
                      value={lumpSum.amount}
                      aria-label={t('Amount (after tax)')}
                      onUpdate={value => {
                        const newAmount = Math.min(
                          MAX_AMOUNT,
                          Math.max(0, value),
                        );
                        if (newAmount !== lumpSum.amount) {
                          updateLumpSum(lumpSum.id, { amount: newAmount });
                        }
                      }}
                    />
                  </Field>

                  <Field
                    width="flex"
                    style={{ minWidth: 190 }}
                    truncate={false}
                  >
                    <Select
                      value={sourceValue}
                      onChange={value =>
                        updateLumpSum(lumpSum.id, {
                          sourcePotId:
                            value === WITHDRAWAL_ORDER_SOURCE ? null : value,
                        })
                      }
                      options={sourceOptions}
                    />
                  </Field>

                  <Field
                    width="flex"
                    style={{ minWidth: 130 }}
                    truncate={false}
                  >
                    {usesTaxBands ? (
                      <MonteCarloNumberInput
                        value={lumpSum.taxableFraction}
                        aria-label={t('Taxable portion (%)')}
                        scale={100}
                        min={0}
                        max={100}
                        onCommit={newValue =>
                          updateLumpSum(lumpSum.id, {
                            taxableFraction: newValue ?? 0,
                          })
                        }
                      />
                    ) : (
                      <MonteCarloNumberInput
                        value={lumpSum.taxRate}
                        aria-label={t('Tax (%)')}
                        scale={100}
                        min={0}
                        max={MAX_WITHDRAWAL_TAX_RATE * 100}
                        onCommit={newValue =>
                          updateLumpSum(lumpSum.id, {
                            taxRate: newValue ?? 0,
                          })
                        }
                      />
                    )}
                  </Field>

                  <Field
                    width="flex"
                    style={{ minWidth: 170 }}
                    truncate={false}
                  >
                    <LabeledCheckbox
                      id={`lump-sum-inflation-${lumpSum.id}`}
                      checked={lumpSum.adjustsWithInflation}
                      onChange={event =>
                        updateLumpSum(lumpSum.id, {
                          adjustsWithInflation: event.target.checked,
                        })
                      }
                    >
                      <Trans>Adjust by inflation</Trans>
                    </LabeledCheckbox>
                  </Field>

                  <Field
                    width={36}
                    truncate={false}
                    style={{ alignItems: 'center' }}
                  >
                    <Button
                      variant="bare"
                      aria-label={t('Remove one-off withdrawal')}
                      onPress={() => removeLumpSum(lumpSum.id)}
                      style={{ padding: 6 }}
                    >
                      <SvgDelete width={12} height={12} />
                    </Button>
                  </Field>
                </Row>
                {isOutsidePlan && (
                  <View
                    style={{
                      backgroundColor: theme.tableBackground,
                      padding: '2px 10px 8px',
                    }}
                  >
                    <Text size="medium" style={{ color: theme.warningText }}>
                      <Trans>
                        Age {{ age: lumpSum.age }} is outside the plan (ages{' '}
                        {{ currentAge }} to {{ lastAge }}), so this is never
                        taken.
                      </Trans>
                    </Text>
                  </View>
                )}
                {!isOutsidePlan && sourceIsLocked && (
                  <View
                    style={{
                      backgroundColor: theme.tableBackground,
                      padding: '2px 10px 8px',
                    }}
                  >
                    <Text size="medium" style={{ color: theme.warningText }}>
                      <Trans>
                        {{ pot: sourcePot.name || t('that pot') }} can&apos;t be
                        accessed until age {{ accessAge: sourcePot.accessAge }},
                        so at age {{ age: lumpSum.age }} this comes from the
                        withdrawal order instead.
                      </Trans>
                    </Text>
                  </View>
                )}
              </Fragment>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <Button onPress={addLumpSum}>
          <SvgAdd width={10} height={10} style={{ marginRight: 5 }} />
          <Trans>Add one-off withdrawal</Trans>
        </Button>
      </View>
    </View>
  );
}
