import { Trans } from 'react-i18next';

import { SvgQuestion } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { Field, TableHeader } from '#components/table';

// Shared by the header and the pot rows so the columns line up. The
// drag/remove columns are fixed; the rest flex evenly, with these minimum
// widths so labels and controls don't get crushed on narrow windows
export const POT_COLUMNS = {
  dragHandle: 36,
  name: 150,
  startingBalance: 120,
  linkedAccount: 160,
  allocation: 190,
  expectedReturn: 150,
  volatility: 170,
  accessAge: 155,
  tax: 155,
  remove: 36,
} as const;

const HEADER_LABEL_STYLE = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  whiteSpace: 'nowrap',
} as const;

type MonteCarloPotsTableHeaderProps = {
  /** True when the bands tax model is active */
  usesTaxBands: boolean;
};

export function MonteCarloPotsTableHeader({
  usesTaxBands,
}: MonteCarloPotsTableHeaderProps) {
  return (
    <TableHeader>
      <Field width={POT_COLUMNS.dragHandle} />
      <Field width="flex" style={{ minWidth: POT_COLUMNS.name }}>
        <Trans>Pot name</Trans>
      </Field>
      <Field width="flex" style={{ minWidth: POT_COLUMNS.startingBalance }}>
        <Trans>Starting balance</Trans>
      </Field>
      <Field
        width="flex"
        style={{ minWidth: POT_COLUMNS.linkedAccount }}
        truncate={false}
      >
        <View style={HEADER_LABEL_STYLE}>
          <Text>
            <Trans>Linked account</Trans>
          </Text>
          <Tooltip
            content={
              <View style={{ maxWidth: 300 }}>
                <Text>
                  <Trans>
                    Use an account&apos;s live balance as this pot&apos;s
                    starting balance, so the plan stays up to date on its own.
                    <br />
                    <br />
                    Typing a starting balance manually unlinks the pot - handy
                    for what-if experiments.
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
      </Field>
      <Field
        width="flex"
        style={{ minWidth: POT_COLUMNS.allocation }}
        truncate={false}
      >
        <View style={HEADER_LABEL_STYLE}>
          <Text>
            <Trans>Portfolio allocation</Trans>
          </Text>
          <Tooltip
            content={
              <View style={{ maxWidth: 300 }}>
                <Text>
                  <Trans>
                    A one-click starting point that fills in a typical expected
                    return and volatility for the selected mix of stocks and
                    bonds. You can still override both values.
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
      </Field>
      <Field
        width="flex"
        style={{ minWidth: POT_COLUMNS.expectedReturn }}
        truncate={false}
      >
        <View style={HEADER_LABEL_STYLE}>
          <Text>
            <Trans>Expected return (%)</Trans>
          </Text>
          <Tooltip
            content={
              <View style={{ maxWidth: 300 }}>
                <Text>
                  <Trans>
                    The average yearly investment return before inflation. Each
                    simulated year draws a random return around this average.
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
      </Field>
      <Field
        width="flex"
        style={{ minWidth: POT_COLUMNS.volatility }}
        truncate={false}
      >
        <View style={HEADER_LABEL_STYLE}>
          <Text>
            <Trans>Volatility (std dev %)</Trans>
          </Text>
          <Tooltip
            content={
              <View style={{ maxWidth: 300 }}>
                <Text>
                  <Trans>
                    How much returns swing from year to year. Higher volatility
                    means bigger ups and downs, which makes running out of money
                    more likely even with the same average return.
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
      </Field>
      <Field
        width="flex"
        style={{ minWidth: POT_COLUMNS.accessAge }}
        truncate={false}
      >
        <View style={HEADER_LABEL_STYLE}>
          <Text>
            <Trans>Accessible from age</Trans>
          </Text>
          <Tooltip
            content={
              <View style={{ maxWidth: 300 }}>
                <Text>
                  <Trans>
                    Some pots can&apos;t be touched until a certain age - e.g.
                    personal pensions. Until then the pot stays invested and
                    keeps growing, but can&apos;t fund withdrawals.
                    <br />
                    <br />
                    Leave blank if the pot is available now.
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
      </Field>
      <Field
        width="flex"
        style={{ minWidth: POT_COLUMNS.tax }}
        truncate={false}
      >
        <View style={HEADER_LABEL_STYLE}>
          <Text>
            {usesTaxBands ? (
              <Trans>Taxable portion (%)</Trans>
            ) : (
              <Trans>Tax (%)</Trans>
            )}
          </Text>
          <Tooltip
            content={
              <View style={{ maxWidth: 300 }}>
                <Text>
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
                </Text>
              </View>
            }
            placement="bottom start"
            style={{ ...styles.tooltip }}
          >
            <SvgQuestion height={12} width={12} cursor="pointer" />
          </Tooltip>
        </View>
      </Field>
      <Field width={POT_COLUMNS.remove} />
    </TableHeader>
  );
}
