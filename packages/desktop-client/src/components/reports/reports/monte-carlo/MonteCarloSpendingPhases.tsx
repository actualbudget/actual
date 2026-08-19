import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { v4 as uuidv4 } from 'uuid';

import { MonteCarloHelpTooltip } from '#components/reports/reports/monte-carlo/MonteCarloHelpTooltip';
import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import {
  createMonteCarloSpendingPhase,
  MAX_AMOUNT,
  sortMonteCarloSpendingPhases,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type { MonteCarloSpendingPhase } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { FIELD_LABEL_STYLE } from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { Field, Row, TableHeader } from '#components/table';
import { FinancialInput } from '#components/util/FinancialInput';

// Fixed remove column; the rest flex evenly with these minimum widths
const PHASE_COLUMNS = {
  name: 150,
  fromAge: 110,
  until: 110,
  spending: 150,
  remove: 36,
} as const;

const PHASE_ROW_HEIGHT = 43;

type MonteCarloSpendingPhasesProps = {
  phases: MonteCarloSpendingPhase[];
  currentAge: number;
  targetAge: number;
  onPhasesChange: (phases: MonteCarloSpendingPhase[]) => void;
};

export function MonteCarloSpendingPhases({
  phases,
  currentAge,
  targetAge,
  onPhasesChange,
}: MonteCarloSpendingPhasesProps) {
  const { t } = useTranslation();

  function updatePhase(
    phaseId: string,
    changes: Partial<MonteCarloSpendingPhase>,
  ) {
    onPhasesChange(
      sortMonteCarloSpendingPhases(
        phases.map(phase =>
          phase.id === phaseId ? { ...phase, ...changes } : phase,
        ),
      ),
    );
  }

  function removePhase(phaseId: string) {
    const remaining = phases.filter(phase => phase.id !== phaseId);
    // The first phase always starts immediately
    if (remaining.length > 0 && remaining[0].fromAge != null) {
      remaining[0] = { ...remaining[0], fromAge: null };
    }
    onPhasesChange(remaining);
  }

  function addPhase() {
    const lastFrom = phases[phases.length - 1]?.fromAge ?? currentAge;
    const fromAge = Math.max(
      currentAge + 1,
      Math.min(targetAge - 1, lastFrom + 10),
    );
    onPhasesChange(
      sortMonteCarloSpendingPhases([
        ...phases,
        createMonteCarloSpendingPhase(uuidv4(), fromAge),
      ]),
    );
  }

  return (
    <View style={{ gap: 10, marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={FIELD_LABEL_STYLE}>
          <Trans>Spending phases</Trans>
        </Text>
        <MonteCarloHelpTooltip>
          <Trans>
            Your yearly spending doesn&apos;t have to stay the same for the
            whole plan. Each phase sets the yearly amount from a given age until
            the next phase begins - for example, more in your active early years
            and less later on.
            <br />
            <br />
            Amounts are in today&apos;s money; the inflation settings on the
            Plan details tab are applied on top.
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
            <Field width="flex" style={{ minWidth: PHASE_COLUMNS.name }}>
              <Trans>Phase name</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: PHASE_COLUMNS.fromAge }}>
              <Trans>From age</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: PHASE_COLUMNS.until }}>
              <Trans>Until</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: PHASE_COLUMNS.spending }}>
              <Trans>Yearly spending</Trans>
            </Field>
            <Field width={PHASE_COLUMNS.remove} />
          </TableHeader>

          {phases.map((phase, index) => {
            const nextPhase = phases[index + 1];
            return (
              <Row
                key={phase.id}
                collapsed
                height={PHASE_ROW_HEIGHT}
                style={{
                  backgroundColor: theme.tableBackground,
                  ':hover': { backgroundColor: theme.tableRowBackgroundHover },
                }}
              >
                <Field
                  width="flex"
                  style={{ minWidth: PHASE_COLUMNS.name }}
                  truncate={false}
                >
                  <Input
                    // Uncontrolled on purpose: committing on blur keeps typing
                    // snappy since every config change re-runs the simulation
                    defaultValue={phase.name}
                    placeholder={t('Phase {{number}}', { number: index + 1 })}
                    onUpdate={newName => {
                      if (newName !== phase.name) {
                        updatePhase(phase.id, { name: newName });
                      }
                    }}
                  />
                </Field>

                <Field
                  width="flex"
                  style={{ minWidth: PHASE_COLUMNS.fromAge }}
                  truncate={false}
                >
                  {index === 0 ? (
                    <Text style={{ color: theme.tableText }}>
                      {t('Now ({{age}})', { age: currentAge })}
                    </Text>
                  ) : (
                    <MonteCarloNumberInput
                      value={phase.fromAge}
                      aria-label={t('From age')}
                      roundToInteger
                      min={currentAge + 1}
                      max={targetAge}
                      step={1}
                      onCommit={newValue =>
                        updatePhase(phase.id, {
                          fromAge: newValue ?? currentAge + 1,
                        })
                      }
                    />
                  )}
                </Field>

                <Field
                  width="flex"
                  style={{ minWidth: PHASE_COLUMNS.until }}
                  truncate={false}
                >
                  <Text style={{ color: theme.tableText }}>
                    {nextPhase?.fromAge != null
                      ? t('Age {{age}}', { age: nextPhase.fromAge - 1 })
                      : t('Onwards')}
                  </Text>
                </Field>

                <Field
                  width="flex"
                  style={{ minWidth: PHASE_COLUMNS.spending }}
                  truncate={false}
                >
                  <FinancialInput
                    value={phase.annualWithdrawal}
                    onUpdate={value =>
                      updatePhase(phase.id, {
                        annualWithdrawal: Math.min(
                          MAX_AMOUNT,
                          Math.max(0, value),
                        ),
                      })
                    }
                  />
                </Field>

                <Field
                  width={PHASE_COLUMNS.remove}
                  truncate={false}
                  style={{ alignItems: 'center' }}
                >
                  {phases.length > 1 && (
                    <Button
                      variant="bare"
                      aria-label={t('Remove phase')}
                      onPress={() => removePhase(phase.id)}
                      style={{ padding: 6 }}
                    >
                      <SvgDelete width={12} height={12} />
                    </Button>
                  )}
                </Field>
              </Row>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row' }}>
        <Button onPress={addPhase}>
          <SvgAdd width={10} height={10} style={{ marginRight: 5 }} />
          <Trans>Add phase</Trans>
        </Button>
      </View>
    </View>
  );
}
