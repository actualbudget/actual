import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import type {
  ReservationExplanation,
  ReservationsBridge,
} from '@actual-app/core/server/budget/pocket-readers';
import type { PocketIncompleteReason } from '@actual-app/core/server/budget/reservations';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { exactDecimal } from '#components/reports/spreadsheets/fx-impact-export';
import { useCategories } from '#hooks/useCategories';

/** Renders a budget-currency amount; null is unavailable. */
type Amount = (value: number | null) => ReactNode;

/**
 * The reservation To Budget subtracts (MC-10): the included cell, its split
 * into this month's assigned bases and the remainder, and each currency.
 */
export function ReservationsSummary({
  reservations,
  amount,
}: {
  reservations: ReservationsBridge;
  amount: Amount;
}) {
  const { t } = useTranslation();
  const rows = [
    { label: t('Assigned this month'), value: reservations.assigned },
    {
      label: t('Spending, resets and revaluation'),
      value: reservations.remainder,
    },
  ];
  return (
    <View
      role="region"
      aria-label={t('Reserved in other currencies')}
      style={{ gap: 4 }}
    >
      <Text>
        <Trans>Reserved in other currencies</Trans>
      </Text>
      {amount(reservations.cell.changes)}
      {reservations.pending && (
        <Text>
          <Trans>Pending: the next refresh will include</Trans>{' '}
          {amount(reservations.changes)}
        </Text>
      )}
      {(reservations.incomplete || reservations.cell.incomplete) && (
        <Text role="status">
          <Trans>Reservation incomplete</Trans>
        </Text>
      )}
      <Figures rows={rows} amount={amount} />
    </View>
  );
}

/** One currency's valuation rule, reasons, figures, backing and lanes. */
export function ReservationCurrency({
  currency,
  amount,
}: {
  currency: ReservationExplanation;
  amount: Amount;
}) {
  const { t } = useTranslation();
  const { data: categories } = useCategories();
  const code = currency.currency;
  const native = (value: number | null) => (
    <PrivacyFilter>
      <FinancialText>
        {value === null
          ? t('Unavailable')
          : `${exactDecimal(value, currency.precision)} ${code}`}
      </FinancialText>
    </PrivacyFilter>
  );
  const valuations = {
    market: t('Market rate'),
    unreserved: t('Nothing reserved'),
    'included-rate': t('Included holdings rate'),
    'last-unit-value': t('Last unit value from {{month}}', {
      month: currency.carriedFrom ?? '',
    }),
    unvalued: t('Unvalued'),
    'unknown-native': t('Unknown native amount'),
  } satisfies Record<ReservationExplanation['valuation'], string>;
  const reasons = useReasonLabels();
  const nativeRows = [
    { label: t('Native holdings'), value: currency.holdings },
    { label: t('Reserved'), value: currency.reserved },
    { label: t('Unreserved'), value: currency.unreserved },
  ];
  const baseRows = [
    { label: t('Booked holdings'), value: currency.bookedHoldings },
    { label: t('Holdings value at close'), value: currency.holdingsValue },
    { label: t('Market value of holdings'), value: currency.marketHoldings },
    {
      label: t('Market value of unreserved'),
      value: currency.marketUnreserved,
    },
    {
      label: t('Account rounding reconciliation'),
      value: currency.accountRounding,
    },
    { label: t('Planning reconciliation'), value: currency.planning },
    { label: t('Holdings gap'), value: currency.gap },
    { label: t('Included FX'), value: currency.includedFx },
    { label: t('Excluded FX'), value: currency.excludedFx },
    { label: t('Included value'), value: currency.includedValue },
    { label: t('Pocket total'), value: currency.pocketTotal },
    { label: t('Included reservation'), value: currency.includedReservation },
    { label: t('Exact change'), value: currency.exactChange },
    { label: t('Written change'), value: currency.writtenChange },
    {
      label: t('Funds from {{currency}}', { currency: code }),
      value: currency.funds,
    },
  ];
  const name = (id: string | null) =>
    categories?.list.find(category => category.id === id)?.name ??
    t('Unresolved owner');
  return (
    <section
      aria-labelledby={`reservation-${code}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        borderTop: '1px solid currentColor',
        paddingTop: 10,
      }}
    >
      <h3 id={`reservation-${code}`} style={{ margin: 0, fontSize: 16 }}>
        <Trans>{{ currency: code }} reservation</Trans>
      </h3>
      <Text>{valuations[currency.valuation]}</Text>
      {currency.rate && (
        <Text>
          {t('Rate on {{date}}: {{rate}}', {
            date: currency.valuationDate,
            rate: currency.rate.rate,
          })}
        </Text>
      )}
      {currency.incomplete.map(reason => (
        <Text key={reason}>{reasons[reason]}</Text>
      ))}
      <dl style={listStyle}>
        {nativeRows.map(row => (
          <Row key={row.label} label={row.label}>
            {native(row.value)}
          </Row>
        ))}
        {baseRows.map(row => (
          <Row key={row.label} label={row.label}>
            {amount(row.value)}
          </Row>
        ))}
      </dl>
      <Text>
        <PrivacyFilter>
          {t('{{reserved}} reserved, {{held}} held', {
            reserved:
              currency.backing.reserved === null
                ? t('Unavailable')
                : `${exactDecimal(currency.backing.reserved, currency.precision)} ${code}`,
            held:
              currency.backing.held === null
                ? t('Unavailable')
                : `${exactDecimal(currency.backing.held, currency.precision)} ${code}`,
          })}
        </PrivacyFilter>
      </Text>
      {currency.backing.shortage && (
        <Text>
          <Trans>Reserved, not held</Trans>
        </Text>
      )}
      {currency.lanes.map(lane => (
        <View key={lane.laneId} style={{ gap: 2 }}>
          <Text style={{ fontWeight: 600 }}>{name(lane.categoryId)}</Text>
          <dl style={listStyle}>
            <Row label={t('Balance')}>{native(lane.balance)}</Row>
            <Row label={t('Value')}>
              {lane.valueKind === 'unknown' ? (
                <Trans>Value unavailable</Trans>
              ) : (
                amount(lane.balanceBase)
              )}
            </Row>
          </dl>
        </View>
      ))}
    </section>
  );
}

function useReasonLabels() {
  const { t } = useTranslation();
  return {
    'rate-unavailable': t('A rate is unavailable for this currency and date.'),
    'fx-excluded': t('Some FX changes were left out of To Budget.'),
    'reservation-unvalued': t('The reservation could not be valued.'),
    'reservation-incomplete': t(
      'Part of this reservation is not yet included in To Budget.',
    ),
    'entry-pending': t('Some assignment equivalents are pending.'),
    'precision-unavailable': t('Recorded currency precision is unavailable.'),
    'pair-encoding-mismatch': t(
      'An assignment is recorded in another currency.',
    ),
    'amount-out-of-range': t('An amount exceeds supported bounds.'),
    'owner-unresolved': t('A pocket has no resolved owner.'),
  } satisfies Record<PocketIncompleteReason, string>;
}

const listStyle = {
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
} as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <dt>{label}</dt>
      <dd style={{ margin: 0 }}>{children}</dd>
    </View>
  );
}

function Figures({
  rows,
  amount,
}: {
  rows: Array<{ label: string; value: number | null }>;
  amount: Amount;
}) {
  return (
    <dl style={listStyle}>
      {rows.map(row => (
        <Row key={row.label} label={row.label}>
          {amount(row.value)}
        </Row>
      ))}
    </dl>
  );
}
