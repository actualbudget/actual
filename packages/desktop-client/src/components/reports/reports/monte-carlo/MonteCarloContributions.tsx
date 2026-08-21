import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { v4 as uuidv4 } from 'uuid';

import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import {
  createMonteCarloContribution,
  MAX_AMOUNT,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloConfig,
  MonteCarloContribution,
  MonteCarloPot,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { Field, Row, TableHeader } from '#components/table';
import { FinancialInput } from '#components/util/FinancialInput';

const CONTRIBUTION_ROW_HEIGHT = 43;

type MonteCarloContributionsProps = {
  contributions: MonteCarloContribution[];
  pots: MonteCarloPot[];
  currentAge: number;
  targetAge: number;
  onConfigChange: (changes: Partial<MonteCarloConfig>) => void;
};

export function MonteCarloContributions({
  contributions,
  pots,
  currentAge,
  targetAge,
  onConfigChange,
}: MonteCarloContributionsProps) {
  const { t } = useTranslation();

  function updateContribution(
    contributionId: string,
    changes: Partial<MonteCarloContribution>,
  ) {
    onConfigChange({
      contributions: contributions.map(contribution =>
        contribution.id === contributionId
          ? { ...contribution, ...changes }
          : contribution,
      ),
    });
  }

  function removeContribution(contributionId: string) {
    onConfigChange({
      contributions: contributions.filter(
        contribution => contribution.id !== contributionId,
      ),
    });
  }

  function addContribution() {
    onConfigChange({
      contributions: [
        ...contributions,
        createMonteCarloContribution(uuidv4(), pots[0].id),
      ],
    });
  }

  if (pots.length === 0) {
    return (
      <Text style={{ color: theme.pageText }}>
        <Trans>
          Add an investment pot first - contributions are paid into a pot.
        </Trans>
      </Text>
    );
  }

  const potOptions = pots.map(
    (pot, potIndex) =>
      [pot.id, pot.name || t('Pot {{number}}', { number: potIndex + 1 })] as [
        string,
        string,
      ],
  );

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
              <Trans>Contribution name</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: 160 }}>
              <Trans>Into pot</Trans>
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
            <Field width="flex" style={{ minWidth: 170 }} />
            <Field width={36} />
          </TableHeader>

          {contributions.map((contribution, index) => (
            <Row
              key={contribution.id}
              collapsed
              height={CONTRIBUTION_ROW_HEIGHT}
              style={{
                backgroundColor: theme.tableBackground,
                ':hover': { backgroundColor: theme.tableRowBackgroundHover },
              }}
            >
              <Field width="flex" style={{ minWidth: 150 }} truncate={false}>
                <Input
                  defaultValue={contribution.name}
                  placeholder={t('Contribution {{number}}', {
                    number: index + 1,
                  })}
                  aria-label={t('Contribution name')}
                  onUpdate={newName => {
                    if (newName !== contribution.name) {
                      updateContribution(contribution.id, { name: newName });
                    }
                  }}
                />
              </Field>

              <Field width="flex" style={{ minWidth: 160 }} truncate={false}>
                <Select
                  value={contribution.potId}
                  onChange={value =>
                    updateContribution(contribution.id, { potId: value })
                  }
                  options={potOptions}
                />
              </Field>

              <Field width="flex" style={{ minWidth: 100 }} truncate={false}>
                <MonteCarloNumberInput
                  value={contribution.fromAge}
                  aria-label={t('From age')}
                  allowEmpty
                  roundToInteger
                  min={currentAge}
                  max={contribution.toAge ?? targetAge}
                  step={1}
                  placeholder={t('Now')}
                  onCommit={newValue =>
                    updateContribution(contribution.id, { fromAge: newValue })
                  }
                />
              </Field>

              <Field width="flex" style={{ minWidth: 100 }} truncate={false}>
                <MonteCarloNumberInput
                  value={contribution.toAge}
                  aria-label={t('To age')}
                  allowEmpty
                  roundToInteger
                  min={contribution.fromAge ?? currentAge}
                  max={targetAge}
                  step={1}
                  placeholder={t('End of plan')}
                  onCommit={newValue =>
                    updateContribution(contribution.id, { toAge: newValue })
                  }
                />
              </Field>

              <Field width="flex" style={{ minWidth: 140 }} truncate={false}>
                <FinancialInput
                  value={contribution.annualAmount}
                  aria-label={t('Amount (per year)')}
                  onUpdate={value => {
                    const newAmount = Math.min(MAX_AMOUNT, Math.max(0, value));
                    if (newAmount !== contribution.annualAmount) {
                      updateContribution(contribution.id, {
                        annualAmount: newAmount,
                      });
                    }
                  }}
                />
              </Field>

              <Field width="flex" style={{ minWidth: 170 }} truncate={false}>
                <LabeledCheckbox
                  id={`contribution-inflation-${contribution.id}`}
                  checked={contribution.adjustsWithInflation}
                  onChange={event =>
                    updateContribution(contribution.id, {
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
                  aria-label={t('Remove contribution')}
                  onPress={() => removeContribution(contribution.id)}
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
        <Button onPress={addContribution}>
          <SvgAdd width={10} height={10} style={{ marginRight: 5 }} />
          <Trans>Add contribution</Trans>
        </Button>
      </View>
    </View>
  );
}
