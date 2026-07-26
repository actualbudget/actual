import type { ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgDotsHorizontalDouble } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';
import type { MonteCarloAllocationPreset } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import { POT_COLUMNS } from '#components/reports/reports/monte-carlo/MonteCarloPotsTableHeader';
import {
  ALLOCATION_PRESETS,
  MAX_AMOUNT,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type { MonteCarloPot } from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import { Field, Row } from '#components/table';
import { FinancialInput } from '#components/util/FinancialInput';
import { useAccounts } from '#hooks/useAccounts';

export const FIELD_LABEL_STYLE = { fontWeight: 600 } as const;

export const FIELD_STYLE = { width: 170 } as const;

export const FIELD_LABEL_ROW_STYLE = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 6,
  minHeight: 18,
} as const;

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

  // Historical models derive this pot's returns from its allocation mix;
  // the manual return/volatility only apply to Custom pots there
  const isManualReturnDisabled =
    usesHistoricalReturns && pot.allocationPreset !== 'custom';

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
          width={POT_COLUMNS.dragHandle}
          truncate={false}
          style={{ alignItems: 'center' }}
        >
          <Button
            slot="drag"
            variant="bare"
            aria-label={t('Drag to reorder')}
            style={{
              padding: 6,
              cursor: 'grab',
              color: theme.pageTextSubdued,
            }}
          >
            <SvgDotsHorizontalDouble
              width={14}
              height={14}
              style={{ transform: 'rotate(90deg)' }}
            />
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
              ...accounts
                .filter(account => account.closed === 0)
                .map(account => [account.id, account.name] as [string, string]),
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
          width="flex"
          style={{ minWidth: POT_COLUMNS.accessAge }}
          truncate={false}
        >
          <MonteCarloNumberInput
            value={pot.accessAge}
            allowEmpty
            roundToInteger
            min={16}
            max={120}
            step={1}
            placeholder={t('Immediately')}
            onCommit={newValue => onPotChange({ accessAge: newValue })}
          />
        </Field>

        <Field
          width="flex"
          style={{ minWidth: POT_COLUMNS.tax }}
          truncate={false}
        >
          {usesTaxBands ? (
            <MonteCarloNumberInput
              value={pot.taxableFraction}
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
              scale={100}
              min={0}
              max={75}
              onCommit={newValue =>
                onPotChange({ withdrawalTaxRate: newValue ?? 0 })
              }
            />
          )}
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
    </GridListItem>
  );
}
