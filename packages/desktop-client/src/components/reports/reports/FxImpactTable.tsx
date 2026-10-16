import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronDown,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  FxAccountMonth,
  FxBridgeAccount,
  FxExchange,
  FxExchangeEnd,
  FxImpactAccountReason,
  FxImpactMonth,
  FxImpactReason,
  FxImpactResult,
  FxRateUsed,
  FxTotal,
} from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import {
  CurrencyFormatProvider,
  useCurrencyFormatOverride,
} from '#hooks/currencyFormatContext';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';

type ResultAccount = FxImpactResult['accounts'][number];

/**
 * The FX impact result as three captioned tables: the selected calendar
 * decomposition, whole-exchange reference figures and the To Budget bridge.
 */
export function FxImpactTable({ result }: { result: FxImpactResult }) {
  const accounts = new Map(result.accounts.map(a => [a.id, a]));
  const currencies = [
    ...new Set(
      result.months.flatMap(month => month.currencies.map(c => c.currency)),
    ),
  ];
  return (
    // Base amounts use the precision recorded in the result.
    <CurrencyFormatProvider
      currencyCode={result.budgetCurrency}
      precision={result.basePrecision}
    >
      <View style={{ gap: 30 }}>
        {result.unknownAccountIds.length > 0 && (
          <p role="status" style={{ margin: 0 }}>
            <Trans>Some selected accounts no longer exist.</Trans>
          </p>
        )}
        <Scroll>
          <table style={tableStyle}>
            <caption style={captionStyle}>
              <Trans>FX impact by currency and month</Trans>
            </caption>
            <ImpactHead />
            {currencies.map(currency => (
              <tbody key={currency}>
                <GroupRow>{currency}</GroupRow>
                {result.months.map(month => {
                  const total = month.currencies.find(
                    c => c.currency === currency,
                  );
                  return (
                    total && (
                      <CurrencyMonth
                        key={month.month}
                        month={month}
                        currency={currency}
                        total={total}
                        accounts={accounts}
                      />
                    )
                  );
                })}
              </tbody>
            ))}
            <tbody>
              <GroupRow>
                <Trans>Selected total</Trans>
              </GroupRow>
              {result.months.map(month => (
                <tr key={month.month}>
                  <th scope="row" style={rowHeaderStyle}>
                    <MonthName month={month.month} />
                    <Incomplete total={month.total} accounts={accounts} />
                    <Note>
                      <Trans>
                        Fees in {{ currency: result.budgetCurrency }}, the
                        budget currency:
                      </Trans>{' '}
                      <FxAmount value={month.budgetCurrencyFeeExpense} />
                    </Note>
                  </th>
                  <ChangeCells values={month.total} />
                  <td style={cellStyle} />
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
        <ExchangeTable result={result} accounts={accounts} />
        <BridgeTable result={result} accounts={accounts} />
      </View>
    </CurrencyFormatProvider>
  );
}

function ImpactHead() {
  const { t } = useTranslation();
  return (
    <thead>
      <tr>
        {[
          t('Month'),
          t('Realized (fee FX beneath)'),
          t('Unrealized change'),
          t('Transfer carry'),
          t('Internal settlement'),
          t('Total change'),
          t('Fee expense'),
          t('Closing unrealized'),
          t('Closing rate'),
        ].map(label => (
          <th key={label} scope="col" style={headerStyle}>
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function CurrencyMonth({
  month,
  currency,
  total,
  accounts,
}: {
  month: FxImpactMonth;
  currency: string;
  total: FxTotal;
  accounts: Map<string, ResultAccount>;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const rows = month.accounts.filter(
    row => accounts.get(row.accountId)?.currency === currency,
  );
  return (
    <>
      <tr>
        <th scope="row" style={rowHeaderStyle}>
          <MonthName month={month.month} />
          <Incomplete total={total} accounts={accounts} />
          <Toggle
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
            label={t('Accounts in {{currency}} for {{month}}', {
              currency,
              month: useMonthName(month.month),
            })}
          >
            <Trans>Accounts</Trans>
          </Toggle>
        </th>
        <ChangeCells values={total} />
        <td style={cellStyle} />
      </tr>
      {isExpanded &&
        rows.map(row => (
          <AccountRow
            key={row.accountId}
            row={row}
            closeDate={month.closeDate}
            accounts={accounts}
          />
        ))}
    </>
  );
}

function AccountRow({
  row,
  closeDate,
  accounts,
}: {
  row: FxAccountMonth;
  closeDate: string;
  accounts: Map<string, ResultAccount>;
}) {
  const account = accounts.get(row.accountId);
  return (
    <tr>
      <th scope="row" style={{ ...rowHeaderStyle, paddingLeft: 30 }}>
        {account?.name ?? row.accountId}
        <Reasons reasons={row.reasons} accounts={accounts} />
      </th>
      <ChangeCells values={{ ...row, closing: row.closing }} />
      <td style={cellStyle}>
        <RateDetails
          rate={row.closing.rate}
          date={closeDate}
          currency={account?.currency ?? ''}
          isEmpty={row.closing.native === 0}
        />
      </td>
    </tr>
  );
}

function ChangeCells({ values }: { values: FxTotal | FxAccountMonth }) {
  return (
    <>
      <td style={cellStyle}>
        <FxAmount value={values.realized} />
        <Note>
          <Trans>Fee FX</Trans> <FxAmount value={values.feeRealized} />
        </Note>
      </td>
      {[
        values.unrealized,
        values.carry,
        values.settlement,
        values.gap,
        values.feeExpense,
        values.closing.unrealized,
      ].map((value, index) => (
        <td key={index} style={cellStyle}>
          <FxAmount value={value} />
        </td>
      ))}
    </>
  );
}

function ExchangeTable({
  result,
  accounts,
}: {
  result: FxImpactResult;
  accounts: Map<string, ResultAccount>;
}) {
  const { t } = useTranslation();
  const months = result.months.filter(month => month.exchanges.length > 0);
  if (months.length === 0) return null;
  return (
    <Scroll>
      <table style={tableStyle}>
        <caption style={captionStyle}>
          <Trans>
            Reference figures for whole exchanges; do not add to FX totals
          </Trans>
        </caption>
        <thead>
          <tr>
            {[
              t('Month'),
              t('Source'),
              t('Destination'),
              t('Exchange value'),
              t('Booked fees'),
              t('Spread estimate'),
            ].map(label => (
              <th key={label} scope="col" style={headerStyle}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map(month => (
            <ExchangeMonth
              key={month.month}
              month={month}
              result={result}
              accounts={accounts}
            />
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

function ExchangeMonth({
  month,
  result,
  accounts,
}: {
  month: FxImpactMonth;
  result: FxImpactResult;
  accounts: Map<string, ResultAccount>;
}) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <>
      <tr>
        <th scope="row" style={rowHeaderStyle}>
          <MonthName month={month.month} />
          <Toggle
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
            label={t('Exchanges for {{month}}', {
              month: useMonthName(month.month),
            })}
          >
            <Trans>Exchanges</Trans>
          </Toggle>
        </th>
        <td style={cellStyle} />
        <td style={cellStyle} />
        <td style={cellStyle} />
        <td style={cellStyle}>
          <FxAmount value={month.diagnostics.fees} />
        </td>
        <td style={cellStyle}>
          <FxAmount value={month.diagnostics.spread} />
        </td>
      </tr>
      {isExpanded &&
        month.exchanges.map((exchange: FxExchange) => (
          <tr key={exchange.id}>
            <th scope="row" style={{ ...rowHeaderStyle, paddingLeft: 30 }}>
              {formatDate(exchange.date)}
            </th>
            {[exchange.source, exchange.destination].map(end => (
              <td key={end.accountId} style={cellStyle}>
                <EndDetails
                  end={end}
                  date={exchange.date}
                  result={result}
                  accounts={accounts}
                />
              </td>
            ))}
            <td style={cellStyle}>
              <FxAmount value={exchange.value} />
            </td>
            <td style={cellStyle} />
            <td style={cellStyle}>
              <FxAmount value={exchange.spread} />
            </td>
          </tr>
        ))}
    </>
  );
}

function EndDetails({
  end,
  date,
  result,
  accounts,
}: {
  end: FxExchangeEnd;
  date: string;
  result: FxImpactResult;
  accounts: Map<string, ResultAccount>;
}) {
  const account = accounts.get(end.accountId);
  const currency = end.currency ?? result.budgetCurrency;
  const precision =
    end.currency === null ? result.basePrecision : (account?.precision ?? null);
  return (
    <View style={{ gap: 2 }}>
      <span>{account?.name ?? end.accountId}</span>
      <NativeAmount
        value={end.native}
        currency={currency}
        precision={precision}
      />
      {end.fee !== 0 && (
        <Note>
          <Trans>Fee</Trans>{' '}
          <NativeAmount
            value={end.fee}
            currency={currency}
            precision={precision}
          />{' '}
          <Trans>booked</Trans> <FxAmount value={end.feeBooked} />
        </Note>
      )}
      {end.currency === null ? (
        <Note>
          <Trans>No FX in the budget currency</Trans>
        </Note>
      ) : (
        <>
          <Note>
            <Trans>Realized</Trans> <FxAmount value={end.realized} />
            {', '}
            <Trans>fee FX</Trans> <FxAmount value={end.feeRealized} />
          </Note>
          <RateDetails
            rate={end.referenceRate}
            date={date}
            currency={end.currency}
            isEmpty={false}
          />
        </>
      )}
      <Reasons reasons={end.reasons} accounts={accounts} />
    </View>
  );
}

function BridgeTable({
  result,
  accounts,
}: {
  result: FxImpactResult;
  accounts: Map<string, ResultAccount>;
}) {
  const { t } = useTranslation();
  return (
    <Scroll>
      <table style={tableStyle}>
        <caption style={captionStyle}>
          <Trans>FX changes included in To Budget</Trans>
        </caption>
        <thead>
          <tr>
            {[
              t('Month'),
              t('Included in To Budget'),
              t('Status'),
              t('Brought forward'),
            ].map(label => (
              <th key={label} scope="col" style={headerStyle}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.months.map(month => (
            <BridgeMonth key={month.month} month={month} accounts={accounts} />
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

function BridgeMonth({
  month,
  accounts,
}: {
  month: FxImpactMonth;
  accounts: Map<string, ResultAccount>;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const bridge = month.bridge;
  const monthName = useMonthName(month.month);
  return (
    <>
      <tr>
        <th scope="row" style={rowHeaderStyle}>
          <MonthName month={month.month} />
          {bridge && bridge.accounts.length > 0 && (
            <Toggle
              isExpanded={isExpanded}
              onToggle={() => setIsExpanded(!isExpanded)}
              label={t('Bridge accounts for {{month}}', { month: monthName })}
            >
              <Trans>Accounts</Trans>
            </Toggle>
          )}
        </th>
        <td style={cellStyle}>
          {bridge?.cell && <FxAmount value={bridge.cell.value} />}
        </td>
        <td style={cellStyle}>
          {!bridge ? (
            <Trans>This month has no budget yet.</Trans>
          ) : bridge.budgetType === 'tracking' ? (
            <Trans>Tracking budgets do not include FX changes.</Trans>
          ) : (
            <View style={{ gap: 2 }}>
              {bridge.pending ? (
                <span>
                  <Trans>Pending: the next refresh will include</Trans>{' '}
                  <FxAmount value={bridge.contribution} />
                </span>
              ) : (
                <Trans>Up to date</Trans>
              )}
              {(bridge.contributionIncomplete || bridge.cell?.incomplete) && (
                <Note>
                  <Trans>Valuation incomplete</Trans>
                </Note>
              )}
            </View>
          )}
        </td>
        <td style={cellStyle}>
          {bridge && <FxAmount value={bridge.broughtForward} />}
        </td>
      </tr>
      {isExpanded &&
        bridge?.accounts.map(row => (
          <BridgeAccountRow key={row.accountId} row={row} accounts={accounts} />
        ))}
    </>
  );
}

function BridgeAccountRow({
  row,
  accounts,
}: {
  row: FxBridgeAccount;
  accounts: Map<string, ResultAccount>;
}) {
  const formatDate = useFormatDate();
  const account = accounts.get(row.accountId);
  const reasons = useReasonLabels();
  return (
    <tr>
      <th scope="row" style={{ ...rowHeaderStyle, paddingLeft: 30 }}>
        {account?.name ?? row.accountId}
      </th>
      <td style={cellStyle}>
        <FxAmount value={row.posted} />
      </td>
      <td style={cellStyle}>
        <View style={{ gap: 2 }}>
          {row.covers.length > 0 && (
            <span>
              <Trans>
                Covers {{ dates: row.covers.map(formatDate).join(', ') }}
              </Trans>
            </span>
          )}
          {row.unavailableReason && (
            <span>{reasons[row.unavailableReason]}</span>
          )}
          {row.stale && (
            <span>
              <Trans>Includes rows recorded in an earlier currency</Trans>
            </span>
          )}
          <RateDetails
            rate={row.rate}
            date={row.closeDate}
            currency={account?.currency ?? ''}
            isEmpty={row.closing === 0}
          />
        </View>
      </td>
      <td style={cellStyle}>
        <FxAmount value={row.broughtForward} />
      </td>
    </tr>
  );
}

function RateDetails({
  rate,
  date,
  currency,
  isEmpty,
}: {
  rate: FxRateUsed | null;
  date: string;
  currency: string;
  isEmpty: boolean;
}) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const kinds: Partial<Record<string, string>> = {
    dated: t('One-day rate'),
    standing: t('Standing rate'),
    fetched: t('Fetched rate'),
  };
  // The table's format override carries the result's budget currency.
  const base = useCurrencyFormatOverride()?.currencyCode ?? '';
  if (!rate) {
    return (
      <Note>
        {isEmpty ? t('No holdings; no rate was needed.') : t('No rate')}
      </Note>
    );
  }
  return (
    <View style={{ gap: 2 }}>
      <PrivacyFilter>
        <FinancialText>
          <Trans>
            1 {{ base }} = {{ rate: rate.rate }} {{ currency }}
          </Trans>
        </FinancialText>
      </PrivacyFilter>
      <Note>
        {kinds[rate.kind] ?? t('Other rate')}
        {', '}
        {t('Source: {{source}}', {
          source: rate.source === 'manual' ? t('Manual') : rate.source,
        })}
      </Note>
      <Note>{t('On {{date}}', { date: formatDate(date) })}</Note>
      <Note>
        {rate.timestamp
          ? // Stored timestamps are canonical UTC ISO strings; keep their UTC day and time.
            t('Effective {{date}} {{time}} UTC', {
              date: formatDate(rate.timestamp.slice(0, 10)),
              time: rate.timestamp.slice(11, 19),
            })
          : t('Effective timestamp unavailable')}
      </Note>
      <Note>
        {rate.fallback
          ? t('Fallback: latest fetched rate before {{date}}', {
              date: formatDate(date),
            })
          : t('No fallback')}
      </Note>
    </View>
  );
}

/** A base amount: unknown is Unavailable, never zero; gains carry a plus sign. */
export function FxAmount({ value }: { value: number | null }) {
  const format = useFormat();
  if (value === null) return <Trans>Unavailable</Trans>;
  return (
    <PrivacyFilter>
      <FinancialText>
        {value > 0 ? '+' : ''}
        {format(value, 'financial')}
      </FinancialText>
    </PrivacyFilter>
  );
}

/** A native amount in its account's recorded currency and precision. */
function NativeAmount({
  value,
  currency,
  precision,
}: {
  value: number | null;
  currency: string;
  precision: number | null;
}) {
  if (precision === null) {
    return (
      <span>
        <Trans>Unavailable: recorded precision unavailable</Trans>
      </span>
    );
  }
  return (
    <CurrencyFormatProvider currencyCode={currency} precision={precision}>
      <FxAmount value={value} />
    </CurrencyFormatProvider>
  );
}

function Incomplete({
  total,
  accounts,
}: {
  total: FxTotal;
  accounts: Map<string, ResultAccount>;
}) {
  if (total.incompleteAccountIds.length === 0) return null;
  const names = total.incompleteAccountIds
    .map(id => accounts.get(id)?.name ?? id)
    .join(', ');
  return (
    <Note>
      <Trans>Incomplete: {{ names }}</Trans>
    </Note>
  );
}

function Reasons({
  reasons,
  accounts,
}: {
  reasons: FxImpactAccountReason[];
  accounts: Map<string, ResultAccount>;
}) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const labels = useReasonLabels();
  return reasons.map(reason => (
    <Note key={`${reason.reason}-${reason.since}-${reason.fromAccountId}`}>
      {reason.fromAccountId
        ? t('{{reason}} since {{date}}, from {{account}}', {
            reason: labels[reason.reason],
            date: formatDate(reason.since),
            account:
              accounts.get(reason.fromAccountId)?.name ?? reason.fromAccountId,
          })
        : t('{{reason}} since {{date}}', {
            reason: labels[reason.reason],
            date: formatDate(reason.since),
          })}
    </Note>
  ));
}

function useReasonLabels(): Record<FxImpactReason, string> {
  const { t } = useTranslation();
  return {
    'rate-unavailable': t('Rate unavailable'),
    'precision-unavailable': t('Recorded precision unavailable'),
    'amount-out-of-range': t('Amount exceeds supported bounds'),
    'native-missing': t('Native amount missing'),
    'sign-mismatch': t('Sign mismatch'),
    'stale-encoding': t('Recorded in an earlier currency'),
    'transfer-link-broken': t('Transfer link broken'),
    'transfer-direction-invalid': t('Transfer direction invalid'),
    'transfer-quantity-mismatch': t('Transfer amounts differ'),
    'family-sum-mismatch': t('Split does not add up'),
    'exchange-family-ambiguous': t('Exchange fee unclear'),
  };
}

function Toggle({
  isExpanded,
  onToggle,
  label,
  children,
}: {
  isExpanded: boolean;
  onToggle: () => void;
  label: string;
  children: ReactNode;
}) {
  const Icon = isExpanded ? SvgCheveronDown : SvgCheveronRight;
  return (
    <Button
      variant="bare"
      aria-expanded={isExpanded}
      aria-label={label}
      onPress={onToggle}
      style={{ alignSelf: 'flex-start', padding: '2px 4px', fontWeight: 400 }}
    >
      <Icon width={10} height={10} style={{ marginRight: 4 }} />
      {children}
    </Button>
  );
}

function MonthName({ month }: { month: string }) {
  return <div>{useMonthName(month)}</div>;
}

function useMonthName(month: string) {
  const locale = useLocale();
  return monthUtils.format(month, 'MMMM yyyy', locale);
}

/** Formats a yyyy-MM-dd day with the user's date preference, without a time zone shift. */
function useFormatDate() {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  return (day: string) => monthUtils.format(day, dateFormat);
}

function GroupRow({ children }: { children: ReactNode }) {
  return (
    <tr>
      <th
        scope="rowgroup"
        colSpan={9}
        style={{
          ...rowHeaderStyle,
          fontWeight: 600,
          backgroundColor: theme.tableRowHeaderBackground,
        }}
      >
        {children}
      </th>
    </tr>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: theme.pageTextSubdued }}>{children}</div>
  );
}

/** Keeps wide tables usable on narrow screens. */
function Scroll({ children }: { children: ReactNode }) {
  return <View style={{ overflowX: 'auto' }}>{children}</View>;
}

const tableStyle: CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  backgroundColor: theme.tableBackground,
};
const captionStyle: CSSProperties = {
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 15,
  padding: '0 0 8px',
};
const headerStyle: CSSProperties = {
  textAlign: 'left',
  fontWeight: 500,
  fontSize: 13,
  color: theme.tableHeaderText,
  backgroundColor: theme.tableHeaderBackground,
  borderBottom: `1px solid ${theme.tableBorder}`,
  padding: '6px 8px',
};
const rowHeaderStyle: CSSProperties = {
  textAlign: 'left',
  fontWeight: 400,
  verticalAlign: 'top',
  borderBottom: `1px solid ${theme.tableBorder}`,
  padding: '6px 8px',
};
const cellStyle: CSSProperties = {
  verticalAlign: 'top',
  borderBottom: `1px solid ${theme.tableBorder}`,
  padding: '6px 8px',
};
