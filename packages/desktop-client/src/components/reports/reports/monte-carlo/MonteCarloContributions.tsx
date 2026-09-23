import { Fragment } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import type {
  SelectHeading,
  SelectOption,
} from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransObjectLiteral } from '@actual-app/core/types/util';
import { v4 as uuidv4 } from 'uuid';

import { FinancialText } from '#components/FinancialText';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { MonteCarloHelpTooltip } from '#components/reports/reports/monte-carlo/MonteCarloHelpTooltip';
import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import {
  createMonteCarloContribution,
  getMonteCarloPotLabel,
  MAX_AMOUNT,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloConfig,
  MonteCarloContribution,
  MonteCarloIncomeStream,
  MonteCarloPot,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { Field, Row, TableHeader } from '#components/table';
import { FinancialInput } from '#components/util/FinancialInput';
import { useFormat } from '#hooks/useFormat';

const CONTRIBUTION_ROW_HEIGHT = 43;

/** The Select value for a contribution paid from outside the plan */
const OUTSIDE_SOURCE = '';

type MonteCarloContributionsProps = {
  contributions: MonteCarloContribution[];
  pots: MonteCarloPot[];
  /** Income streams a contribution can be paid out of */
  incomeStreams: MonteCarloIncomeStream[];
  currentAge: number;
  targetAge: number;
  onConfigChange: (changes: Partial<MonteCarloConfig>) => void;
};

export function MonteCarloContributions({
  contributions,
  pots,
  incomeStreams,
  currentAge,
  targetAge,
  onConfigChange,
}: MonteCarloContributionsProps) {
  const { t } = useTranslation();
  const format = useFormat();

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
        createMonteCarloContribution(
          uuidv4(),
          // The surplus pot is managed by the plan, so start on an ordinary one
          (pots.find(pot => !pot.isSurplus) ?? pots[0]).id,
        ),
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
      [pot.id, getMonteCarloPotLabel(pots, potIndex, t)] satisfies [
        string,
        string,
      ],
  );
  // Named as the Paid from dropdown lists them
  function getIncomeStreamLabel(incomeIndex: number) {
    const incomeStream = incomeStreams[incomeIndex];
    return (
      incomeStream.name || t('Income {{number}}', { number: incomeIndex + 1 })
    );
  }

  const sourceOptions: SelectOption[] = [
    [OUTSIDE_SOURCE, t('Outside the plan')],
    ...(incomeStreams.length > 0
      ? [[Menu.label, t('Income streams')] satisfies SelectHeading]
      : []),
    ...incomeStreams.map(
      (incomeStream, incomeIndex) =>
        [incomeStream.id, getIncomeStreamLabel(incomeIndex)] satisfies [
          string,
          string,
        ],
    ),
  ];

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
            <Field width="flex" style={{ minWidth: 160 }}>
              <Trans>Paid from</Trans>
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
            <Field width="flex" style={{ minWidth: 170 }}>
              <Trans>Inflation</Trans>
            </Field>
            <Field width="flex" style={{ minWidth: 120 }} truncate={false}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                }}
              >
                <Text>
                  <Trans>Before tax</Trans>
                </Text>
                <MonteCarloHelpTooltip>
                  <Trans>
                    For a contribution paid from an income stream: tick it to
                    take the money out of the income before its tax is worked
                    out, like a workplace pension or salary sacrifice - the
                    stream then pays less tax. Leave it unticked to save from
                    income that has already been taxed.
                    <br />
                    <br />
                    For example, a 10,000 contribution from a 12,000 income
                    taxed at 20%: before tax, only the remaining 2,000 is taxed
                    (400); after tax, the full 12,000 is taxed (2,400) and the
                    contribution comes out of what is left. A state pension is
                    usually taxed as you receive it, so it stays unticked.
                  </Trans>
                </MonteCarloHelpTooltip>
              </View>
            </Field>
            <Field width={36} />
          </TableHeader>

          {contributions.map((contribution, index) => {
            // A contribution paid from an income stream can only ever take
            // what the stream brings in, so say so when the amount is more
            const sourceIndex = incomeStreams.findIndex(
              incomeStream =>
                incomeStream.id === contribution.sourceIncomeStreamId,
            );
            const sourceStream =
              sourceIndex >= 0 ? incomeStreams[sourceIndex] : null;
            const exceedsSource =
              sourceStream != null &&
              contribution.annualAmount > sourceStream.annualAmount;
            return (
              <Fragment key={contribution.id}>
                <Row
                  collapsed
                  height={CONTRIBUTION_ROW_HEIGHT}
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
                      defaultValue={contribution.name}
                      placeholder={t('Contribution {{number}}', {
                        number: index + 1,
                      })}
                      aria-label={t('Contribution name')}
                      onUpdate={newName => {
                        if (newName !== contribution.name) {
                          updateContribution(contribution.id, {
                            name: newName,
                          });
                        }
                      }}
                    />
                  </Field>

                  <Field
                    width="flex"
                    style={{ minWidth: 160 }}
                    truncate={false}
                  >
                    <Select
                      value={contribution.potId}
                      onChange={value =>
                        updateContribution(contribution.id, { potId: value })
                      }
                      options={potOptions}
                    />
                  </Field>

                  <Field
                    width="flex"
                    style={{ minWidth: 160 }}
                    truncate={false}
                  >
                    <Select
                      value={
                        contribution.sourceIncomeStreamId ?? OUTSIDE_SOURCE
                      }
                      onChange={value =>
                        updateContribution(contribution.id, {
                          sourceIncomeStreamId:
                            value === OUTSIDE_SOURCE ? null : value,
                          // Before tax only means something for income
                          ...(value === OUTSIDE_SOURCE && { beforeTax: false }),
                        })
                      }
                      options={sourceOptions}
                    />
                  </Field>

                  <Field
                    width="flex"
                    style={{ minWidth: 100 }}
                    truncate={false}
                  >
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
                        updateContribution(contribution.id, {
                          fromAge: newValue,
                        })
                      }
                    />
                  </Field>

                  <Field
                    width="flex"
                    style={{ minWidth: 100 }}
                    truncate={false}
                  >
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

                  <Field
                    width="flex"
                    style={{ minWidth: 140 }}
                    truncate={false}
                  >
                    <FinancialInput
                      value={contribution.annualAmount}
                      aria-label={t('Amount (per year)')}
                      onUpdate={value => {
                        const newAmount = Math.min(
                          MAX_AMOUNT,
                          Math.max(0, value),
                        );
                        if (newAmount !== contribution.annualAmount) {
                          updateContribution(contribution.id, {
                            annualAmount: newAmount,
                          });
                        }
                      }}
                    />
                  </Field>

                  <Field
                    width="flex"
                    style={{ minWidth: 170 }}
                    truncate={false}
                  >
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
                    width="flex"
                    style={{ minWidth: 120 }}
                    truncate={false}
                  >
                    {contribution.sourceIncomeStreamId != null && (
                      <LabeledCheckbox
                        id={`contribution-before-tax-${contribution.id}`}
                        checked={contribution.beforeTax}
                        onChange={event =>
                          updateContribution(contribution.id, {
                            beforeTax: event.target.checked,
                          })
                        }
                      >
                        <Trans>Before tax</Trans>
                      </LabeledCheckbox>
                    )}
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
                {exceedsSource && (
                  <View
                    style={{
                      backgroundColor: theme.tableBackground,
                      padding: '2px 10px 8px',
                    }}
                  >
                    <Text style={{ color: theme.warningText, fontSize: 13 }}>
                      <Trans>
                        {{ stream: getIncomeStreamLabel(sourceIndex) }} pays{' '}
                        <PrivacyFilter>
                          <FinancialText as="span">
                            {
                              {
                                amount: format(
                                  sourceStream.annualAmount,
                                  'financial',
                                ),
                              } as TransObjectLiteral
                            }
                          </FinancialText>
                        </PrivacyFilter>{' '}
                        a year, so no more than that - less any tax, unless
                        Before tax is ticked - can be paid in from it.
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
        <Button onPress={addContribution}>
          <SvgAdd width={10} height={10} style={{ marginRight: 5 }} />
          <Trans>Add contribution</Trans>
        </Button>
      </View>
    </View>
  );
}
