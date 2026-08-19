import { useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import {
  SvgCheveronDown,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { MonteCarloAllocationPreset } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { MonteCarloHelpTooltip } from '#components/reports/reports/monte-carlo/MonteCarloHelpTooltip';
import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import { POT_COLUMNS } from '#components/reports/reports/monte-carlo/MonteCarloPotsTableHeader';
import {
  ALLOCATION_PRESETS,
  MAX_AMOUNT,
  MAX_ANNUAL_FEE_RATE,
  MAX_WITHDRAWAL_TAX_RATE,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type { MonteCarloPot } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import {
  FIELD_LABEL_ROW_STYLE,
  FIELD_LABEL_STYLE,
  FIELD_STYLE,
  GROUP_HEADING_STYLE,
} from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { Field, Row } from '#components/table';
import { FinancialInput } from '#components/util/FinancialInput';
import { useAccounts } from '#hooks/useAccounts';

const POT_ROW_HEIGHT = 43;

type MonteCarloPotConfigurationProps = ComponentPropsWithoutRef<
  typeof GridListItem<MonteCarloPot>
> & {
  pot: MonteCarloPot;
  potNumber: number;
  canRemove: boolean;
  /** True when a historical return model is active */
  usesHistoricalReturns: boolean;
  /** True when the bands tax model is active */
  usesTaxBands: boolean;
  onPotChange: (changes: Partial<MonteCarloPot>) => void;
  onRemove: () => void;
};

export function MonteCarloPotConfiguration({
  pot,
  potNumber,
  canRemove,
  usesHistoricalReturns,
  usesTaxBands,
  onPotChange,
  onRemove,
  ...props
}: MonteCarloPotConfigurationProps) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const [isExpanded, setIsExpanded] = useState(false);

  // Historical models derive this pot's returns from its allocation mix;
  // the manual return/volatility only apply to Custom pots there
  const isManualReturnDisabled =
    usesHistoricalReturns && pot.allocationPreset !== 'custom';

  // A linked account that has since been closed or deleted isn't in the
  // open-accounts list; keep it represented so the stored link doesn't
  // display as a blank selection
  const openAccounts = accounts.filter(account => account.closed === 0);
  const linkedAccount = accounts.find(account => account.id === pot.accountId);
  const missingLinkedOptions: Array<[string, string]> =
    pot.accountId != null &&
    !openAccounts.some(account => account.id === pot.accountId)
      ? [
          [
            pot.accountId,
            linkedAccount
              ? t('{{name}} (closed)', { name: linkedAccount.name })
              : t('Unavailable account'),
          ],
        ]
      : [];

  return (
    <GridListItem
      textValue={pot.name || t('Pot {{number}}', { number: potNumber })}
      className={css({
        '&[data-dragging]': {
          opacity: 0.5,
        },
      })}
      {...props}
    >
      <Row
        collapsed
        height={POT_ROW_HEIGHT}
        style={{
          backgroundColor: theme.tableBackground,
          ':hover': { backgroundColor: theme.tableRowBackgroundHover },
        }}
      >
        <Field
          width={POT_COLUMNS.expand}
          truncate={false}
          style={{ alignItems: 'center' }}
        >
          <Button
            variant="bare"
            aria-label={
              isExpanded ? t('Hide more settings') : t('Show more settings')
            }
            onPress={() => setIsExpanded(!isExpanded)}
            style={{ padding: 6 }}
          >
            {isExpanded ? (
              <SvgCheveronDown width={14} height={14} />
            ) : (
              <SvgCheveronRight width={14} height={14} />
            )}
          </Button>
        </Field>

        <Field
          width="flex"
          style={{ minWidth: POT_COLUMNS.name }}
          truncate={false}
        >
          <Input
            // Uncontrolled on purpose: committing on blur keeps typing
            // snappy since every config change re-runs the simulation
            defaultValue={pot.name}
            placeholder={t('Pot {{number}}', { number: potNumber })}
            onUpdate={newName => {
              if (newName !== pot.name) {
                onPotChange({ name: newName });
              }
            }}
          />
        </Field>

        <Field
          width="flex"
          style={{ minWidth: POT_COLUMNS.startingBalance }}
          truncate={false}
        >
          <FinancialInput
            value={pot.startingBalance}
            // Typing a different balance takes manual control: the pot
            // unlinks from its account and keeps the typed value. The
            // changed-check stops a mere tab-through from unlinking.
            onUpdate={value => {
              const newBalance = Math.min(MAX_AMOUNT, Math.max(0, value));
              if (newBalance !== pot.startingBalance) {
                onPotChange({
                  startingBalance: newBalance,
                  accountId: null,
                });
              }
            }}
          />
        </Field>

        <Field
          width="flex"
          style={{ minWidth: POT_COLUMNS.linkedAccount }}
          truncate={false}
        >
          <Select
            value={pot.accountId ?? ''}
            onChange={value =>
              onPotChange({ accountId: value === '' ? null : value })
            }
            options={[
              ['', t('None')],
              ...missingLinkedOptions,
              ...openAccounts.map(
                account => [account.id, account.name] as [string, string],
              ),
            ]}
          />
        </Field>

        <Field
          width="flex"
          style={{ minWidth: POT_COLUMNS.allocation }}
          truncate={false}
        >
          <Select
            value={pot.allocationPreset}
            onChange={value => {
              const preset = value as MonteCarloAllocationPreset;
              if (preset === 'custom') {
                onPotChange({ allocationPreset: preset });
              } else {
                onPotChange({
                  allocationPreset: preset,
                  expectedReturnMean: ALLOCATION_PRESETS[preset].mean,
                  returnStdDev: ALLOCATION_PRESETS[preset].stdDev,
                });
              }
            }}
            options={[
              ['equity-100', t('100% stocks')],
              ['equity-80', t('80% stocks / 20% bonds')],
              ['equity-60', t('60% stocks / 40% bonds')],
              ['equity-40', t('40% stocks / 60% bonds')],
              ['cash', t('Cash / money market')],
              ['custom', t('Custom')],
            ]}
          />
        </Field>

        <Field
          width="flex"
          style={{ minWidth: POT_COLUMNS.expectedReturn }}
          truncate={false}
        >
          <MonteCarloNumberInput
            value={pot.expectedReturnMean}
            aria-label={t('Expected return (%)')}
            scale={100}
            min={-100}
            max={100}
            disabled={isManualReturnDisabled}
            onCommit={newValue =>
              onPotChange({
                expectedReturnMean: newValue ?? 0,
                allocationPreset: 'custom',
              })
            }
          />
        </Field>

        <Field
          width="flex"
          style={{ minWidth: POT_COLUMNS.volatility }}
          truncate={false}
        >
          <MonteCarloNumberInput
            value={pot.returnStdDev}
            aria-label={t('Volatility (std dev %)')}
            scale={100}
            min={0}
            max={100}
            disabled={isManualReturnDisabled}
            onCommit={newValue =>
              onPotChange({
                returnStdDev: newValue ?? 0,
                allocationPreset: 'custom',
              })
            }
          />
        </Field>

        <Field
          width={POT_COLUMNS.remove}
          truncate={false}
          style={{ alignItems: 'center' }}
        >
          {canRemove && (
            <Button
              variant="bare"
              aria-label={t('Remove pot')}
              onPress={onRemove}
              style={{ padding: 6 }}
            >
              <SvgDelete width={12} height={12} />
            </Button>
          )}
        </Field>
      </Row>

      {isExpanded && (
        <View
          style={{
            backgroundColor: theme.tableBackground,
            borderBottom: `1px solid ${theme.tableBorder}`,
            padding: '12px 15px 16px',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            rowGap: 15,
            columnGap: 40,
          }}
        >
          <View style={{ gap: 10 }}>
            <Text style={GROUP_HEADING_STYLE}>
              <Trans>Access</Trans>
            </Text>
            <View style={FIELD_STYLE}>
              <View style={FIELD_LABEL_ROW_STYLE}>
                <Text style={FIELD_LABEL_STYLE}>
                  <Trans>Accessible from age</Trans>
                </Text>
                <MonteCarloHelpTooltip>
                  <Trans>
                    Some pots can&apos;t be touched until a certain age - e.g.
                    personal pensions. Until then the pot stays invested and
                    keeps growing, but can&apos;t fund withdrawals.
                    <br />
                    <br />
                    Leave blank if the pot is available now.
                  </Trans>
                </MonteCarloHelpTooltip>
              </View>
              <MonteCarloNumberInput
                value={pot.accessAge}
                aria-label={t('Accessible from age')}
                allowEmpty
                roundToInteger
                min={16}
                max={120}
                step={1}
                placeholder={t('Immediately')}
                onCommit={newValue => onPotChange({ accessAge: newValue })}
              />
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={GROUP_HEADING_STYLE}>
              <Trans>Tax</Trans>
            </Text>
            <View style={FIELD_STYLE}>
              <View style={FIELD_LABEL_ROW_STYLE}>
                <Text style={FIELD_LABEL_STYLE}>
                  {usesTaxBands ? (
                    <Trans>Taxable portion (%)</Trans>
                  ) : (
                    <Trans>Tax (%)</Trans>
                  )}
                </Text>
                <MonteCarloHelpTooltip>
                  {usesTaxBands ? (
                    <Trans>
                      The share of a withdrawal from this pot that counts as
                      taxable income under your tax bands - e.g. a pension with
                      a 25% tax-free portion is 75, a tax-free account is 0, and
                      a taxable account is roughly the share of each withdrawal
                      that is gains.
                    </Trans>
                  ) : (
                    <Trans>
                      The effective tax rate on withdrawals from this pot. Your
                      spending is what you keep after tax, so the simulation
                      withdraws extra to cover it - e.g. a tax-free account is
                      0, a pension blending its tax-free portion with income tax
                      might be around 15, and a taxable account its effective
                      gains rate.
                    </Trans>
                  )}
                </MonteCarloHelpTooltip>
              </View>
              {usesTaxBands ? (
                <MonteCarloNumberInput
                  value={pot.taxableFraction}
                  aria-label={t('Taxable portion (%)')}
                  scale={100}
                  min={0}
                  max={100}
                  onCommit={newValue =>
                    onPotChange({ taxableFraction: newValue ?? 1 })
                  }
                />
              ) : (
                <MonteCarloNumberInput
                  value={pot.withdrawalTaxRate}
                  aria-label={t('Tax (%)')}
                  scale={100}
                  min={0}
                  max={MAX_WITHDRAWAL_TAX_RATE * 100}
                  onCommit={newValue =>
                    onPotChange({ withdrawalTaxRate: newValue ?? 0 })
                  }
                />
              )}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={GROUP_HEADING_STYLE}>
              <Trans>Fees</Trans>
            </Text>
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
                    <Trans>Fixed yearly fee</Trans>
                  </Text>
                  <MonteCarloHelpTooltip>
                    <Trans>
                      The sum of all fixed yearly costs on this pot - e.g.
                      adviser or platform fees - charged at the end of each
                      year.
                    </Trans>
                  </MonteCarloHelpTooltip>
                </View>
                <FinancialInput
                  value={pot.annualFeeFixed}
                  onUpdate={value => {
                    const newFee = Math.min(MAX_AMOUNT, Math.max(0, value));
                    if (newFee !== pot.annualFeeFixed) {
                      onPotChange({ annualFeeFixed: newFee });
                    }
                  }}
                />
              </View>

              <LabeledCheckbox
                id={`pot-fee-inflation-${pot.id}`}
                checked={pot.feeAdjustsWithInflation}
                onChange={event =>
                  onPotChange({
                    feeAdjustsWithInflation: event.target.checked,
                  })
                }
                style={{ flex: 'unset', paddingBottom: 6 }}
              >
                <Trans>Adjust by inflation</Trans>
              </LabeledCheckbox>

              <View style={FIELD_STYLE}>
                <View style={FIELD_LABEL_ROW_STYLE}>
                  <Text style={FIELD_LABEL_STYLE}>
                    <Trans>Fee (% of balance)</Trans>
                  </Text>
                  <MonteCarloHelpTooltip>
                    <Trans>
                      A yearly percentage of the pot&apos;s end-of-year balance
                      - e.g. fund or platform charges.
                    </Trans>
                  </MonteCarloHelpTooltip>
                </View>
                <MonteCarloNumberInput
                  value={pot.annualFeeRate}
                  aria-label={t('Fee (% of balance)')}
                  scale={100}
                  min={0}
                  max={MAX_ANNUAL_FEE_RATE * 100}
                  step={0.01}
                  onCommit={newValue =>
                    onPotChange({ annualFeeRate: newValue ?? 0 })
                  }
                />
              </View>
            </View>
          </View>
        </View>
      )}
    </GridListItem>
  );
}
