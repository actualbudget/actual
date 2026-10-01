import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { v4 as uuidv4 } from 'uuid';

import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import {
  createMonteCarloIncomeStream,
  MAX_AMOUNT,
  MAX_WITHDRAWAL_TAX_RATE,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloConfig,
  MonteCarloContribution,
  MonteCarloIncomeStream,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { Field, Row, TableHeader } from '#components/table';
import { FinancialInput } from '#components/util/FinancialInput';

const INCOME_ROW_HEIGHT = 43;

type MonteCarloIncomeStreamsProps = {
  incomeStreams: MonteCarloIncomeStream[];
  /** Contributions paid out of a removed stream fall back to outside money */
  contributions: MonteCarloContribution[];
  /** True when the bands tax model is active */
  usesTaxBands: boolean;
  currentAge: number;
  targetAge: number;
  onConfigChange: (changes: Partial<MonteCarloConfig>) => void;
};

export function MonteCarloIncomeStreams({
  incomeStreams,
  contributions,
  usesTaxBands,
  currentAge,
  targetAge,
  onConfigChange,
}: MonteCarloIncomeStreamsProps) {
  const { t } = useTranslation();

  function updateIncomeStream(
    incomeStreamId: string,
    changes: Partial<MonteCarloIncomeStream>,
  ) {
    onConfigChange({
      incomeStreams: incomeStreams.map(incomeStream =>
        incomeStream.id === incomeStreamId
          ? { ...incomeStream, ...changes }
          : incomeStream,
      ),
    });
  }

  function removeIncomeStream(incomeStreamId: string) {
    onConfigChange({
      incomeStreams: incomeStreams.filter(
        incomeStream => incomeStream.id !== incomeStreamId,
      ),
      contributions: contributions.map(contribution =>
        contribution.sourceIncomeStreamId === incomeStreamId
          ? { ...contribution, sourceIncomeStreamId: null, beforeTax: false }
          : contribution,
      ),
    });
  }

  function addIncomeStream() {
    onConfigChange({
      incomeStreams: [...incomeStreams, createMonteCarloIncomeStream(uuidv4())],
    });
  }

  return (
    <View style={{ gap: 10 }}>
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
              <Trans>Income name</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: 100 }}>
              <Trans>From age</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: 100 }}>
              <Trans>To age</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: 140 }}>
              <Trans>Amount (per year)</Trans>
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

          {incomeStreams.map((incomeStream, index) => (
            <Row
              key={incomeStream.id}
              collapsed
              height={INCOME_ROW_HEIGHT}
              style={{
                backgroundColor: theme.tableBackground,
                ':hover': { backgroundColor: theme.tableRowBackgroundHover },
              }}
            >
              <Field width="flex" style={{ minWidth: 150 }} truncate={false}>
                <Input
                  defaultValue={incomeStream.name}
                  placeholder={t('Income {{number}}', { number: index + 1 })}
                  aria-label={t('Income name')}
                  onUpdate={newName => {
                    if (newName !== incomeStream.name) {
                      updateIncomeStream(incomeStream.id, { name: newName });
                    }
                  }}
                />
              </Field>

              <Field width="flex" style={{ minWidth: 100 }} truncate={false}>
                <MonteCarloNumberInput
                  value={incomeStream.fromAge}
                  aria-label={t('From age')}
                  allowEmpty
                  roundToInteger
                  min={currentAge}
                  max={incomeStream.toAge ?? targetAge}
                  step={1}
                  placeholder={t('Now')}
                  onCommit={newValue =>
                    updateIncomeStream(incomeStream.id, { fromAge: newValue })
                  }
                />
              </Field>

              <Field width="flex" style={{ minWidth: 100 }} truncate={false}>
                <MonteCarloNumberInput
                  value={incomeStream.toAge}
                  aria-label={t('To age')}
                  allowEmpty
                  roundToInteger
                  min={incomeStream.fromAge ?? currentAge}
                  max={targetAge}
                  step={1}
                  placeholder={t('End of plan')}
                  onCommit={newValue =>
                    updateIncomeStream(incomeStream.id, { toAge: newValue })
                  }
                />
              </Field>

              <Field width="flex" style={{ minWidth: 140 }} truncate={false}>
                <FinancialInput
                  value={incomeStream.annualAmount}
                  aria-label={t('Amount (per year)')}
                  onUpdate={value => {
                    const newAmount = Math.min(MAX_AMOUNT, Math.max(0, value));
                    if (newAmount !== incomeStream.annualAmount) {
                      updateIncomeStream(incomeStream.id, {
                        annualAmount: newAmount,
                      });
                    }
                  }}
                />
              </Field>

              <Field width="flex" style={{ minWidth: 130 }} truncate={false}>
                {usesTaxBands ? (
                  <MonteCarloNumberInput
                    value={incomeStream.taxableFraction}
                    aria-label={t('Taxable portion (%)')}
                    scale={100}
                    min={0}
                    max={100}
                    onCommit={newValue =>
                      updateIncomeStream(incomeStream.id, {
                        taxableFraction: newValue ?? 1,
                      })
                    }
                  />
                ) : (
                  <MonteCarloNumberInput
                    value={incomeStream.taxRate}
                    aria-label={t('Tax (%)')}
                    scale={100}
                    min={0}
                    max={MAX_WITHDRAWAL_TAX_RATE * 100}
                    onCommit={newValue =>
                      updateIncomeStream(incomeStream.id, {
                        taxRate: newValue ?? 0,
                      })
                    }
                  />
                )}
              </Field>

              <Field width="flex" style={{ minWidth: 170 }} truncate={false}>
                <LabeledCheckbox
                  id={`income-inflation-${incomeStream.id}`}
                  checked={incomeStream.adjustsWithInflation}
                  onChange={event =>
                    updateIncomeStream(incomeStream.id, {
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
                  aria-label={t('Remove income')}
                  onPress={() => removeIncomeStream(incomeStream.id)}
                  style={{ padding: 6 }}
                >
                  <SvgDelete width={12} height={12} />
                </Button>
              </Field>
            </Row>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <Button onPress={addIncomeStream}>
          <SvgAdd width={10} height={10} style={{ marginRight: 5 }} />
          <Trans>Add income</Trans>
        </Button>
      </View>
    </View>
  );
}
