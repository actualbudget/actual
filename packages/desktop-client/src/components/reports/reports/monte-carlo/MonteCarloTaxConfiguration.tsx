import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { MonteCarloTaxModel } from '@actual-app/core/types/models';
import { v4 as uuidv4 } from 'uuid';

import { MonteCarloHelpTooltip } from '#components/reports/reports/monte-carlo/MonteCarloHelpTooltip';
import { MonteCarloNumberInput } from '#components/reports/reports/monte-carlo/MonteCarloNumberInput';
import {
  createMonteCarloTaxBand,
  MAX_AMOUNT,
  MAX_TAX_BAND_RATE,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import type {
  MonteCarloConfig,
  MonteCarloTaxBand,
} from '#components/reports/reports/monte-carlo/monteCarloSimulation';
import {
  FIELD_LABEL_ROW_STYLE,
  FIELD_LABEL_STYLE,
} from '#components/reports/reports/monte-carlo/monteCarloStyles';
import { Field, Row, TableHeader } from '#components/table';
import { FinancialInput } from '#components/util/FinancialInput';

const BAND_ROW_HEIGHT = 43;

function sortBands(bands: MonteCarloTaxBand[]) {
  return [...bands].sort((bandA, bandB) => bandA.from - bandB.from);
}

type MonteCarloTaxConfigurationProps = {
  taxModel: MonteCarloTaxModel;
  taxBands: MonteCarloTaxBand[];
  onConfigChange: (changes: Partial<MonteCarloConfig>) => void;
};

export function MonteCarloTaxConfiguration({
  taxModel,
  taxBands,
  onConfigChange,
}: MonteCarloTaxConfigurationProps) {
  const { t } = useTranslation();

  function updateBand(bandId: string, changes: Partial<MonteCarloTaxBand>) {
    onConfigChange({
      taxBands: sortBands(
        taxBands.map(band =>
          band.id === bandId ? { ...band, ...changes } : band,
        ),
      ),
    });
  }

  function removeBand(bandId: string) {
    const remaining = taxBands.filter(band => band.id !== bandId);
    // The first band always starts at zero income
    if (remaining.length > 0 && remaining[0].from !== 0) {
      remaining[0] = { ...remaining[0], from: 0 };
    }
    onConfigChange({ taxBands: remaining });
  }

  function addBand() {
    const lastFrom = taxBands[taxBands.length - 1]?.from ?? 0;
    onConfigChange({
      taxBands: sortBands([
        ...taxBands,
        createMonteCarloTaxBand(uuidv4(), lastFrom + 2_500_000),
      ]),
    });
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ width: 250 }}>
        <View style={FIELD_LABEL_ROW_STYLE}>
          <Text style={FIELD_LABEL_STYLE}>
            <Trans>Tax model</Trans>
          </Text>
          <MonteCarloHelpTooltip>
            <Trans>
              Your yearly spending is what you keep after tax; the simulation
              withdraws extra to cover the tax.
              <br />
              <br />
              Flat rate: each pot has one effective tax rate on its withdrawals
              - simple and jurisdiction-free.
              <br />
              <br />
              Tax bands: enter your own progressive bands, and each pot declares
              how much of a withdrawal counts as taxable income. The bands apply
              to each year&apos;s combined taxable withdrawals.
            </Trans>
          </MonteCarloHelpTooltip>
        </View>
        <Select
          value={taxModel}
          onChange={value =>
            onConfigChange({ taxModel: value as MonteCarloTaxModel })
          }
          options={[
            ['flat', t('Flat rate per pot')],
            ['bands', t('Tax bands (progressive)')],
          ]}
        />
      </View>

      {taxModel === 'flat' ? (
        <Text style={{ color: theme.pageText }}>
          <Trans>
            Set each pot&apos;s Tax (%) on the Investment pots tab. Leave it at
            0 for tax-free pots.
          </Trans>
        </Text>
      ) : (
        <>
          <Text style={{ color: theme.pageText }}>
            <Trans>
              Amounts are yearly taxable income in today&apos;s money - the
              thresholds rise with inflation. Set each pot&apos;s Taxable
              portion (%) on the Investment pots tab.
            </Trans>
          </Text>

          <View style={{ ...styles.tableContainer, flex: 'unset' }}>
            <TableHeader>
              <Field width="flex" style={{ minWidth: 160 }}>
                <Trans>Income from</Trans>
              </Field>
              <Field width="flex" style={{ minWidth: 140 }}>
                <Trans>Taxed at (%)</Trans>
              </Field>
              <Field width={36} />
            </TableHeader>

            {taxBands.map((band, index) => (
              <Row
                key={band.id}
                collapsed
                height={BAND_ROW_HEIGHT}
                style={{
                  backgroundColor: theme.tableBackground,
                  ':hover': { backgroundColor: theme.tableRowBackgroundHover },
                }}
              >
                <Field width="flex" style={{ minWidth: 160 }} truncate={false}>
                  {index === 0 ? (
                    <Text style={{ color: theme.tableText }}>
                      <Trans>First earnings</Trans>
                    </Text>
                  ) : (
                    <FinancialInput
                      value={band.from}
                      onUpdate={value => {
                        const newFrom = Math.min(
                          MAX_AMOUNT,
                          Math.max(0, value),
                        );
                        if (newFrom !== band.from) {
                          updateBand(band.id, { from: newFrom });
                        }
                      }}
                    />
                  )}
                </Field>

                <Field width="flex" style={{ minWidth: 140 }} truncate={false}>
                  <MonteCarloNumberInput
                    value={band.rate}
                    aria-label={t('Taxed at (%)')}
                    scale={100}
                    min={0}
                    max={MAX_TAX_BAND_RATE * 100}
                    onCommit={newValue =>
                      updateBand(band.id, { rate: newValue ?? 0 })
                    }
                  />
                </Field>

                <Field
                  width={36}
                  truncate={false}
                  style={{ alignItems: 'center' }}
                >
                  {taxBands.length > 1 && (
                    <Button
                      variant="bare"
                      aria-label={t('Remove band')}
                      onPress={() => removeBand(band.id)}
                      style={{ padding: 6 }}
                    >
                      <SvgDelete width={12} height={12} />
                    </Button>
                  )}
                </Field>
              </Row>
            ))}
          </View>

          <View style={{ flexDirection: 'row' }}>
            <Button onPress={addBand}>
              <SvgAdd width={10} height={10} style={{ marginRight: 5 }} />
              <Trans>Add band</Trans>
            </Button>
          </View>
        </>
      )}
    </View>
  );
}
