import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { nativeToBase } from '@actual-app/core/shared/exchange-rate';
import { foreignSplitBases } from '@actual-app/core/shared/foreign-split';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { fromRegisterView } from '#accounts/registerView';
import { BudgetCurrencyFormat } from '#hooks/currencyFormatContext';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useEditEffects } from '#hooks/useEditEffects';
import { useFormat } from '#hooks/useFormat';
import { useDispatch } from '#redux';
import {
  confirmReconciledEdit,
  foreignEditErrorMessage,
  snapshotOf,
  staleEditMessage,
} from '#util/foreign-edit';

import { BudgetNotice } from './BudgetNotice';
import { RateField, rateInDirection, storedRate } from './RateField';
import type { RateDirection } from './RateField';

export type InlineForeignSplitDraft = {
  id: string;
  original: TransactionEntity[];
  rows: TransactionEntity[];
};

/** Only conversion and confirmation controls; split cells stay in TransactionTable. */
export function InlineForeignSplit(props: {
  draft: InlineForeignSplitDraft;
  account: AccountEntity;
  onCancel: () => void;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  return (
    <BudgetCurrencyFormat>
      <InlineForeignSplitInner {...props} />
    </BudgetCurrencyFormat>
  );
}

function InlineForeignSplitInner({
  draft,
  account,
  onCancel,
  onSaved,
  onBusyChange,
}: Parameters<typeof InlineForeignSplit>[0]) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const basePrecision = useAmountPrecision();
  const baseFormat = useFormat(basePrecision);
  const [baseInput, setBaseInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [direction, setDirection] = useState<RateDirection>('base-per-foreign');
  const [resolution, setResolution] = useState<{
    date: string;
    rate: string | undefined;
  }>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const saving = useRef(false);
  const original = fromRegisterView(draft.original);
  const before = original.find(r => r.id === draft.id);
  const parent = draft.rows.find(r => r.id === draft.id);
  const children = draft.rows.filter(r => r.parent_id === draft.id);
  const native = (r: TransactionEntity) =>
    r._baseAmount === undefined ? (r.transaction_amount ?? 0) : r.amount;
  const total = parent ? native(parent) : 0;
  const changed = total !== before?.transaction_amount;
  const collapsing = !!before?.is_parent && !parent?.is_parent;
  const conversion = !collapsing && (changed || total === 0);
  const date = parent?.date ?? before?.date;
  const savedRate =
    resolution?.date === parent?.date ? resolution?.rate : undefined;

  useEffect(() => {
    let cancelled = false;
    if (date && account.currency) {
      void send('exchange-rates/resolve', {
        quoteCurrency: account.currency,
        date,
      })
        .then(result => {
          if (!cancelled) {
            setResolution({
              date,
              rate: result.status === 'resolved' ? result.rate : undefined,
            });
          }
        })
        .catch(() => {
          if (!cancelled) setResolution(undefined);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [account.currency, date]);

  let rate: string | undefined;
  let base = before?.amount ?? 0;
  let valid =
    !!parent &&
    !!before &&
    (collapsing ||
      (children.length > 0 &&
        children.reduce((sum, r) => sum + BigInt(native(r)), 0n) ===
          BigInt(total)));
  try {
    rate = rateInput.trim() ? storedRate(rateInput, direction) : savedRate;
    if (changed) {
      if (total === 0) {
        base = 0;
      } else if (baseInput.trim()) {
        const parsed = baseFormat.fromEdit(baseInput);
        if (parsed == null) valid = false;
        else base = Math.sign(total) * Math.abs(parsed);
      } else if (rate) {
        base = nativeToBase(
          total,
          account.currency_precision ?? basePrecision,
          basePrecision,
          rate,
        );
      } else {
        valid = false;
      }
    }
    if (!collapsing && total === 0 && !rate) valid = false;
  } catch {
    valid = false;
  }

  let valued: Array<{ id: string; amount: number }> = [];
  if (valid && !collapsing) {
    try {
      valued = foreignSplitBases(
        base,
        children.map(r => ({ id: r.id, native: native(r) })),
        total === 0 && rate
          ? {
              rate,
              nativePrecision: account.currency_precision ?? basePrecision,
              basePrecision,
            }
          : undefined,
      );
    } catch {
      valid = false;
    }
  }
  const posting = (r: TransactionEntity, amount: number) => ({
    account: r.account,
    date: r.date,
    category: r.is_parent ? null : (r.category ?? null),
    amount,
    isParent: !!r.is_parent,
  });
  const after = parent
    ? [
        posting(parent, base),
        ...children.map((r, i) => posting(r, valued[i]?.amount ?? 0)),
      ]
    : [];
  const effects = useEditEffects(
    !valid
      ? null
      : [
          ...original
            .filter(r => r.id === draft.id || r.parent_id === draft.id)
            .map(r => ({ before: posting(r, r.amount), after: null })),
          ...after.map(r => ({ before: null, after: r })),
        ],
  );

  async function save() {
    if (!valid || !before || !parent || saving.current || stale) return;
    saving.current = true;
    setBusy(true);
    onBusyChange(true);
    try {
      if (
        !(await confirmReconciledEdit(
          dispatch,
          original.some(r => r.reconciled),
        ))
      ) {
        return;
      }
      const expected = Object.fromEntries(
        original.map(r => [r.id, snapshotOf(r)]),
      );
      const result = collapsing
        ? await send('transactions/collapse-foreign-split', {
            id: draft.id,
            expected,
          })
        : await send('transactions/save-foreign-split', {
            id: draft.id,
            expected,
            fields: {
              ...(parent.date !== before.date && { date: parent.date }),
              ...(parent.notes !== before.notes && {
                notes: parent.notes ?? null,
              }),
              ...(parent.payee !== before.payee && {
                payee: parent.payee ?? null,
              }),
              ...(!!parent.cleared !== !!before.cleared && {
                cleared: !!parent.cleared,
              }),
            },
            transaction_amount: total,
            children: children.map(r => {
              const stored = original.find(row => row.id === r.id);
              return {
                id: r.id,
                transaction_amount: native(r),
                ...(!stored || r.category !== stored.category
                  ? { category: r.category ?? null }
                  : {}),
                ...(!stored || r.notes !== stored.notes
                  ? { notes: r.notes ?? null }
                  : {}),
                ...(!stored || r.payee !== stored.payee
                  ? { payee: r.payee ?? null }
                  : {}),
                ...(!stored || !!r.cleared !== !!stored.cleared
                  ? { cleared: !!r.cleared }
                  : {}),
                ...(!stored || r.sort_order !== stored.sort_order
                  ? { sort_order: r.sort_order ?? 0 }
                  : {}),
              };
            }),
            ...(conversion
              ? rateInput.trim() && total !== 0 && !baseInput.trim()
                ? { rate, expectedBaseAmount: base }
                : { baseAmount: base, ...(total === 0 && { rate }) }
              : {}),
          });
      if (result.status === 'ok') {
        onSaved();
      } else if (result.status === 'stale') {
        setStale(true);
        setMessage(staleEditMessage(t));
      } else {
        setMessage(t('Rate unavailable. Enter a base amount or rate.'));
      }
    } catch (error) {
      setMessage(foreignEditErrorMessage(t, error));
    } finally {
      saving.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <View style={{ padding: '8px 20px', gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {conversion && (
          <RateField
            disabled={busy}
            name="splitRate"
            currencyCode={account.currency ?? ''}
            value={rateInput}
            direction={direction}
            placeholder={
              savedRate ? rateInDirection(savedRate, direction) : undefined
            }
            style={{ width: 'auto' }}
            onChange={(value, next) => {
              setRateInput(value);
              setDirection(next);
            }}
          />
        )}
        {conversion && total !== 0 ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trans>Budget value</Trans>
            <Input
              disabled={busy}
              aria-label={t('Base amount')}
              value={baseInput}
              placeholder={baseFormat.forEdit(base)}
              inputMode="decimal"
              onChangeValue={setBaseInput}
              style={{ width: 110 }}
            />
          </label>
        ) : (
          <Text>
            <Trans>
              Budget value: {{ amount: baseFormat(base, 'financial') }}
            </Trans>
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button isDisabled={busy} onPress={onCancel}>
            <Trans>Cancel split edits</Trans>
          </Button>
          <Button
            variant="primary"
            isDisabled={busy || stale || !valid || effects.status === 'loading'}
            onPress={() => void save()}
          >
            <Trans>Save splits</Trans>
          </Button>
        </View>
      </View>
      <BudgetNotice effects={effects} />
      {message && <Text style={{ color: theme.errorText }}>{message}</Text>}
    </View>
  );
}
