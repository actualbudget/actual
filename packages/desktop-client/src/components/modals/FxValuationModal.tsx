import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useBudgetPrecision } from '#hooks/useAmountPrecision';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useFxSummary } from '#hooks/useFxSummary';
import { useFxValuation } from '#hooks/useFxValuation';
import type { FxValuation } from '#hooks/useFxValuation';
import { useLocale } from '#hooks/useLocale';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSyncedPref } from '#hooks/useSyncedPref';

export function FxValuationModal({ month }: { month: string }) {
  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
      <FxValuationDetails month={month} />
    </SheetNameProvider>
  );
}

function FxValuationDetails({ month }: { month: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const formatDate = useFormatDate();
  const included = useFxSummary();
  const query = useFxValuation(
    month,
    included.ready ? included.amount : null,
    included.ready ? included.incomplete : null,
  );
  const precision = useBudgetPrecision();
  const format = useFormat(precision);
  const amount = (value: number | null) => (
    <PrivacyFilter>
      <FinancialText>
        {value === null ? t('Unavailable') : format(value, 'financial')}
      </FinancialText>
    </PrivacyFilter>
  );
  const bridge = query.data;

  return (
    <Modal name="fx-valuation" containerProps={{ style: { width: 620 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('FX valuation details for {{month}}', {
              month: monthUtils.format(month, 'MMMM yyyy', locale),
            })}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: 12 }}>
            <View style={{ gap: 4 }}>
              <Text>
                <Trans>Included in To Budget</Trans>
              </Text>
              {included.ready ? (
                amount(included.amount)
              ) : (
                <Text>
                  <Trans>Loading included FX changes...</Trans>
                </Text>
              )}
            </View>
            {(included.incomplete || bridge?.incomplete) && (
              <Text role="status">
                <Trans>Valuation incomplete</Trans>
              </Text>
            )}
            <Text>
              <Trans>
                FX changes are already included in Available funds. These
                details do not add them again or change posted transactions.
              </Trans>
            </Text>
            {query.isPending && (
              <Text role="status">
                <Trans>Loading valuation...</Trans>
              </Text>
            )}
            {query.isError && (
              <View role="alert" style={{ gap: 8 }}>
                <Text>
                  <Trans>
                    Could not load the valuation. Included FX changes remain in
                    To Budget.
                  </Trans>
                </Text>
                <Button onPress={() => void query.refetch()}>
                  <Trans>Retry</Trans>
                </Button>
              </View>
            )}
            {bridge && (
              <>
                <View
                  role="region"
                  aria-label={t('Valuation totals')}
                  style={{ gap: 4 }}
                >
                  <Text>
                    <Trans>Calculated valuation</Trans>
                  </Text>
                  <ValuationAmounts values={bridge} amount={amount} />
                  {bridge.unavailableReason === 'amount-out-of-range' && (
                    <Text>
                      <Trans>
                        The valuation total exceeds supported bounds.
                      </Trans>
                    </Text>
                  )}
                </View>
                <Text>
                  <Trans>
                    Opening holdings plus frozen booked flows plus monthly FX
                    reconcile to closing holdings only when both valuations are
                    known. A net change can cover earlier unresolved closes.
                  </Trans>
                </Text>
                <Text>
                  <Trans>
                    Brought-forward FX is a change from before the budget range.
                    It is included in To Budget separately and is not part of
                    this month's opening-to-closing reconciliation.
                  </Trans>
                </Text>
                {bridge.accounts.length === 0 && (
                  <Text>
                    <Trans>
                      No on-budget holdings in another currency contribute to
                      this month.
                    </Trans>
                  </Text>
                )}
                {bridge.accounts.map(account => (
                  <View
                    key={account.account}
                    style={{
                      gap: 6,
                      borderTop: '1px solid currentColor',
                      paddingTop: 10,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: 16 }}>
                      <Trans>
                        {{ name: account.name }} (
                        {{ currency: account.currency }})
                      </Trans>
                    </h3>
                    <ValuationAmounts values={account} amount={amount} />
                    <RateDetails
                      date={account.openDate}
                      rate={account.openingRate}
                      value={account.opening}
                      currency={account.currency}
                      opening
                    />
                    <RateDetails
                      date={account.closeDate}
                      rate={account.rate}
                      value={account.closing}
                      currency={account.currency}
                    />
                    {account.unavailableReason === 'rate-unavailable' && (
                      <Text>
                        <Trans>
                          A rate is unavailable for this currency and date.
                        </Trans>
                      </Text>
                    )}
                    {account.unavailableReason === 'precision-unavailable' && (
                      <Text>
                        <Trans>
                          Recorded currency precision is unavailable.
                        </Trans>
                      </Text>
                    )}
                    {account.unavailableReason === 'amount-out-of-range' && (
                      <Text>
                        <Trans>The amount exceeds supported bounds.</Trans>
                      </Text>
                    )}
                    {account.covers.length > 0 && (
                      <Text>
                        <Trans>
                          Covered unresolved closes:{' '}
                          {{ dates: account.covers.map(formatDate).join(', ') }}
                        </Trans>
                      </Text>
                    )}
                  </View>
                ))}
              </>
            )}
          </View>
          <ModalButtons>
            <Button variant="primary" onPress={() => state.close()}>
              <Trans>Close</Trans>
            </Button>
          </ModalButtons>
        </>
      )}
    </Modal>
  );
}

type Amounts = Pick<
  FxValuation,
  'opening' | 'flows' | 'posted' | 'broughtForward' | 'closing'
>;
function ValuationAmounts({
  values,
  amount,
}: {
  values: Amounts;
  amount: (value: number | null) => ReactNode;
}) {
  const { t } = useTranslation();
  const rows = [
    { label: t('Opening valued holdings'), value: values.opening },
    { label: t('Frozen booked flows'), value: values.flows },
    { label: t('Monthly FX changes'), value: values.posted },
    { label: t('Brought-forward FX'), value: values.broughtForward },
    { label: t('Closing valued holdings'), value: values.closing },
  ];
  return (
    <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rows.map(row => (
        <View
          key={row.label}
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <dt>{row.label}</dt>
          <dd style={{ margin: 0 }}>{amount(row.value)}</dd>
        </View>
      ))}
    </dl>
  );
}

function RateDetails({
  date,
  rate,
  value,
  currency,
  opening = false,
}: {
  date: string;
  rate: FxValuation['accounts'][number]['rate'];
  value: number | null;
  currency: string;
  opening?: boolean;
}) {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const [budgetCurrency = ''] = useSyncedPref('defaultCurrencyCode');
  const kinds: Partial<Record<string, string>> = {
    dated: t('One-day rate'),
    standing: t('Standing rate'),
    fetched: t('Fetched rate'),
  };
  return (
    <View style={{ gap: 2 }}>
      <Text>
        {opening
          ? t('Opening valuation: {{date}}', { date: formatDate(date) })
          : t('Closing valuation: {{date}}', { date: formatDate(date) })}
      </Text>
      {rate ? (
        <>
          <PrivacyFilter>
            <FinancialText>
              <Trans>
                1 {{ budgetCurrency }} = {{ rate: rate.rate }} {{ currency }}
              </Trans>
            </FinancialText>
          </PrivacyFilter>
          <Text>{kinds[rate.kind] ?? t('Other rate')}</Text>
          <Text>
            {t('Source: {{source}}', {
              source: rate.source === 'manual' ? t('Manual') : rate.source,
            })}
          </Text>
          <Text>
            {rate.timestamp
              ? // Stored timestamps are canonical UTC ISO strings; keep their UTC day and time.
                t('Effective timestamp: {{date}} {{time}} UTC', {
                  date: formatDate(rate.timestamp.slice(0, 10)),
                  time: rate.timestamp.slice(11, 19),
                })
              : t('Effective timestamp unavailable')}
          </Text>
          <Text>
            {rate.fallback
              ? t('Fallback: latest fetched rate before {{date}}', {
                  date: formatDate(date),
                })
              : t('No fallback')}
          </Text>
        </>
      ) : (
        <Text>
          {value === 0
            ? t('Zero holdings; no rate was needed.')
            : t('No rate was used.')}
        </Text>
      )}
    </View>
  );
}

/** Formats a yyyy-MM-dd day with the user's date preference, without a time zone shift. */
function useFormatDate() {
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  return (day: string) => monthUtils.format(day, dateFormat);
}
