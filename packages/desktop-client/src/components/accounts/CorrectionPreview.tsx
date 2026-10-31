import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';
import type { Handlers } from '@actual-app/core/types/handlers';
import type { TFunction } from 'i18next';

import { MissingRateForm } from '#components/modals/ImportTransactionsModal/MissingRateForm';
import { BudgetNotice } from '#components/transactions/BudgetNotice';
import { useAccounts } from '#hooks/useAccounts';
import { useFormat } from '#hooks/useFormat';
import { usePayees } from '#hooks/usePayees';
import { aqlQuery } from '#queries/aqlQuery';
import type { AppDispatch } from '#redux/store';
import { confirmReconciledEdit } from '#util/foreign-edit';

export type CorrectionMode = 'convert' | 'keep';

export type CorrectionPreview = Awaited<
  ReturnType<Handlers['accounts/currency-correction-preview']>
>;

type CorrectionRow = CorrectionPreview['rows'][number];

/** A correction to a new currency, or a repair of stale rows (MC-7.3). */
export type CorrectionRequest =
  | {
      kind: 'correction';
      account: string;
      currency: string;
      mode: CorrectionMode;
    }
  | { kind: 'repair'; account: string; mode: CorrectionMode };

export type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; preview: CorrectionPreview }
  | { status: 'refused'; error: string };

function requestPreview(request: CorrectionRequest) {
  return request.kind === 'repair'
    ? send('accounts/stale-encoding-preview', {
        account: request.account,
        mode: request.mode,
      })
    : send('accounts/currency-correction-preview', {
        account: request.account,
        currency: request.currency,
        mode: request.mode,
      });
}

/**
 * The preview for the request shown. A response for an older request (or
 * an older refresh) is never shown for a newer one.
 */
export function useCorrectionPreview(request: CorrectionRequest | null) {
  const [version, setVersion] = useState(0);
  const key = request ? `${JSON.stringify(request)}#${version}` : null;
  const [result, setResult] = useState<({ key: string } & PreviewState) | null>(
    null,
  );
  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    const parsed = JSON.parse(key.slice(0, key.lastIndexOf('#')));
    requestPreview(parsed as CorrectionRequest).then(
      preview => {
        if (!cancelled) setResult({ key, status: 'ready', preview });
      },
      (error: unknown) => {
        if (!cancelled) {
          setResult({
            key,
            status: 'refused',
            error:
              error instanceof Error || (error && typeof error === 'object')
                ? String((error as { message?: unknown }).message)
                : String(error),
          });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);
  const state: PreviewState | null =
    key === null ? null : result?.key === key ? result : { status: 'loading' };
  return { state, refresh: () => setVersion(v => v + 1) };
}

export function changesAmounts(row: CorrectionRow) {
  return (
    !!row.after &&
    (row.after.amount !== row.before.amount ||
      row.after.transaction_amount !== row.before.transaction_amount)
  );
}

/** A refusal in the preview itself: a row the correction cannot compute. */
export function rowRefusal(preview: CorrectionPreview): string | null {
  return preview.rows.find(row => row.error)?.error ?? null;
}

/** What the user reads for a refused preview, with what they can do. */
export function correctionErrorMessage(t: TFunction, code: string) {
  switch (code) {
    case 'account-currency-has-schedules':
      return t(
        'A schedule cannot follow this change. Edit or delete the schedules of this account (or schedules that transfer to it) and try again.',
      );
    case 'correction-schedule-action-unsupported':
      return t(
        'A schedule of this account sets a fixed split amount. Edit or delete that schedule and try again.',
      );
    case 'correction-exchange-fee-unsupported':
      return t(
        'A transfer with a fee would no longer be an exchange between currencies. Remove its fee and try again.',
      );
    case 'correction-split-transfer-unsupported':
      return t(
        'A split transfer would become an exchange between currencies, which cannot be split. Remove the split and try again.',
      );
    case 'correction-exchange-invalid':
      return t(
        'A transfer would not be a valid exchange in the new currency. Check its amounts and fees and try again.',
      );
    case 'correction-transfer-broken':
      return t(
        'A transfer of this account has lost its other side. Fix or delete it and try again.',
      );
    case 'correction-stale-rows-pending':
      return t(
        'Some transactions from another device use an earlier currency. Repair them first.',
      );
    case 'account-currency-unchanged':
      return t('This account already uses the selected currency.');
    case 'amount-out-of-range':
      return t(
        'An amount would be too large in the new currency. Adjust it and try again.',
      );
    case 'split-family-inconsistent':
      return t(
        'A split transaction does not add up to its total. Fix it and try again.',
      );
    default:
      return t('The change could not be previewed.');
  }
}

/**
 * Asks once about reconciled rows the change edits: this account's own, or
 * only other accounts' (the linked-transfer wording).
 */
export async function confirmCorrection(
  dispatch: AppDispatch,
  preview: CorrectionPreview,
  accountId: string,
) {
  const ids = preview.rows
    .filter(row => changesAmounts(row) || row.scheduleUnlinked)
    .map(row => row.id);
  if (ids.length === 0) return true;
  const { data } = await aqlQuery(
    q('transactions')
      .withDead()
      .filter({ id: { $oneof: ids }, reconciled: true })
      .select(['id', 'account'])
      .options({ splits: 'all' }),
  );
  const reconciled = data as Array<{ id: string; account: string }>;
  if (reconciled.length === 0) return true;
  return confirmReconciledEdit(
    dispatch,
    true,
    reconciled.some(row => row.account === accountId)
      ? 'editReconciled'
      : 'batchEditWithReconciledTransfer',
  );
}

/** What a correction or repair preview will do, before it is applied. */
export function CorrectionPreviewView({
  preview,
  accountId,
  onRatesSaved,
}: {
  preview: CorrectionPreview;
  /** The corrected account, whose own rows carry no account id. */
  accountId: string;
  onRatesSaved: () => void;
}) {
  const accounts = useAccounts();
  const payees = usePayees();
  const budgetFormat = useFormat();
  const accountName = (id: string | undefined) =>
    accounts.data?.find(account => account.id === id)?.name ?? '';

  const own = preview.rows.filter(row => !row.external);
  const changed = own.filter(changesAmounts);
  // A conversion can lose precision even when its stored integers stay.
  const rounded = own.filter(row => row.roundingLoss);
  const counterparts = [
    ...new Set(
      preview.rows
        .filter(row => row.external && changesAmounts(row))
        .map(row => accountName(row.account)),
    ),
  ];
  const schedules = preview.schedules.filter(
    schedule => schedule.after !== schedule.before,
  );
  const unlinked = preview.rows.filter(row => row.scheduleUnlinked);
  const quotes = new Map<string, string[]>();
  for (const { date, currency } of preview.missingRateQuotes) {
    quotes.set(currency, [...(quotes.get(currency) ?? []), date]);
  }
  const unsupported = preview.unsupported.map(id =>
    preview.rows.find(row => row.id === id),
  );
  const [payeeOf, setPayeeOf] = useState<Map<string, string | null>>(new Map());
  const unsupportedKey = preview.unsupported.join(',');
  useEffect(() => {
    if (!unsupportedKey) return;
    let cancelled = false;
    void aqlQuery(
      q('transactions')
        .withDead()
        .filter({ id: { $oneof: unsupportedKey.split(',') } })
        .select(['id', 'payee'])
        .options({ splits: 'all' }),
    ).then(({ data }) => {
      if (cancelled) return;
      setPayeeOf(
        new Map(
          (data as Array<{ id: string; payee: string | null }>).map(row => [
            row.id,
            row.payee,
          ]),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [unsupportedKey]);
  const payeeName = (id: string) =>
    payees.data?.find(payee => payee.id === payeeOf.get(id))?.name ?? '';

  return (
    <View style={{ gap: 8 }}>
      <Text>
        <Trans>Transactions that change: {{ count: changed.length }}.</Trans>
        {rounded.length > 0 && (
          <>
            {' '}
            <Trans>
              Rounded to the new currency's decimal places:{' '}
              {{ count: rounded.length }}.
            </Trans>
          </>
        )}
      </Text>
      {counterparts.length > 0 && (
        <Text>
          <Trans>
            Transfers with these accounts change too:{' '}
            {{ accounts: counterparts.join(', ') }}
          </Trans>
        </Text>
      )}
      {schedules.length > 0 && (
        <Text>
          <Trans>
            Schedules that change to the new currency:{' '}
            {{ count: schedules.length }}.
          </Trans>
        </Text>
      )}
      {unlinked.length > 0 && (
        <View>
          <Text>
            <Trans>
              These transactions will no longer be linked to their schedule:
            </Trans>
          </Text>
          {unlinked.map(row => (
            <Text key={row.id} style={{ color: theme.pageTextSubdued }}>
              {accountName(row.account ?? accountId)}, {row.date}
            </Text>
          ))}
        </View>
      )}
      <BudgetNotice effects={{ status: 'ready', months: preview.effects }} />
      {[...quotes].map(([currency, dates]) => (
        <MissingRateForm
          key={currency}
          dates={[...dates].sort()}
          currencyCode={currency}
          onSaved={onRatesSaved}
        />
      ))}
      {unsupported.length > 0 && (
        <View>
          <Text style={{ color: theme.warningText }}>
            <Trans>
              These transfers keep the earlier currency until you delete them:
            </Trans>
          </Text>
          {unsupported.map(
            row =>
              row && (
                <Text key={row.id} style={{ color: theme.pageTextSubdued }}>
                  {row.date} {payeeName(row.id)}{' '}
                  {budgetFormat(row.before.amount, 'financial')}
                </Text>
              ),
          )}
        </View>
      )}
      <Text style={{ color: theme.pageTextSubdued }}>
        <Trans>This change cannot be undone.</Trans>
      </Text>
    </View>
  );
}

/** The two correction modes, listed in the order given (the default first). */
export function ModeChoice({
  mode,
  order,
  onChange,
  disabled = false,
}: {
  mode: CorrectionMode;
  order: [CorrectionMode, CorrectionMode];
  onChange: (mode: CorrectionMode) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const labels: Record<CorrectionMode, { title: string; detail: string }> = {
    keep: {
      title: t('Keep the numbers'),
      detail: t(
        "Each amount keeps its number in the new currency; budget amounts are recalculated at each date's rate.",
      ),
    },
    convert: {
      title: t('Convert existing amounts'),
      detail: t(
        "Each budget amount stays the same; amounts in the new currency are calculated at each date's rate.",
      ),
    },
  };
  return (
    <View role="radiogroup" aria-label={t('Mode')} style={{ gap: 6 }}>
      {order.map(value => (
        <label
          key={value}
          style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
        >
          <input
            type="radio"
            name="correction-mode"
            value={value}
            checked={mode === value}
            disabled={disabled}
            onChange={() => onChange(value)}
          />
          <View>
            <Text style={{ fontWeight: 600 }}>{labels[value].title}</Text>
            <Text style={{ color: theme.pageTextSubdued }}>
              {labels[value].detail}
            </Text>
          </View>
        </label>
      ))}
    </View>
  );
}
