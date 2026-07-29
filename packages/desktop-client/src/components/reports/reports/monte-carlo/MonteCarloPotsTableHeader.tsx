import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { MonteCarloHelpTooltip } from '#components/reports/reports/monte-carlo/MonteCarloHelpTooltip';
import { Field, TableHeader } from '#components/table';

// Shared by the header and the pot rows so the columns line up. The
// drag/expand/remove columns are fixed; the rest flex evenly, with these
// minimum widths so labels and controls don't get crushed on narrow
// windows. Access, tax and fee settings live in the expandable panel
// under each row, not in columns.
export const POT_COLUMNS = {
  expand: 36,
  name: 150,
  startingBalance: 120,
  linkedAccount: 160,
  allocation: 190,
  expectedReturn: 150,
  volatility: 170,
  remove: 36,
} as const;

const HEADER_LABEL_STYLE = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  whiteSpace: 'nowrap',
} as const;

export function MonteCarloPotsTableHeader() {
  return (
    <TableHeader>
      <Field width={POT_COLUMNS.expand} />
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
          <MonteCarloHelpTooltip>
            <Trans>
              Use an account&apos;s live balance as this pot&apos;s starting
              balance, so the plan stays up to date on its own.
              <br />
              <br />
              Typing a starting balance manually unlinks the pot - handy for
              what-if experiments.
            </Trans>
          </MonteCarloHelpTooltip>
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
          <MonteCarloHelpTooltip>
            <Trans>
              A one-click starting point that fills in a typical expected return
              and volatility for the selected mix of stocks and bonds. You can
              still override both values.
            </Trans>
          </MonteCarloHelpTooltip>
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
          <MonteCarloHelpTooltip>
            <Trans>
              The average yearly investment return before inflation. Each
              simulated year draws a random return around this average.
            </Trans>
          </MonteCarloHelpTooltip>
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
          <MonteCarloHelpTooltip>
            <Trans>
              How much returns swing from year to year. Higher volatility means
              bigger ups and downs, which makes running out of money more likely
              even with the same average return.
            </Trans>
          </MonteCarloHelpTooltip>
        </View>
      </Field>
      <Field width={POT_COLUMNS.remove} />
    </TableHeader>
  );
}
