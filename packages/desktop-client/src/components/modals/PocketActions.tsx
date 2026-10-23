import { useState } from 'react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type {
  PocketTransferResult,
  PocketWriteResult,
  RequestAmount,
} from '@actual-app/core/server/budget/pocket-flows';
import type { PocketMonth } from '@actual-app/core/server/budget/pocket-readers';

import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { useCategories } from '#hooks/useCategories';
import { useCategoryPockets } from '#hooks/useCategoryPockets';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';

type PocketActionsProps = {
  pocket: PocketMonth;
  categoryId: string;
  month: string;
  onDone: () => void;
};

/**
 * A currency slot's actions (MC-10.5): its native budget, rollover from
 * this month, transfers, covering overspending and finalizing pending
 * budget-currency equivalents. Every native amount is sent with the
 * encoding the slot was read at.
 */
export function PocketActions({
  pocket,
  categoryId,
  month,
  onDone,
}: PocketActionsProps) {
  const { t } = useTranslation();
  const own = pocket.lanes.find(lane => lane.kind === 'own');
  const pending = pocket.lanes.filter(
    lane =>
      lane.budgeted !== 0 && lane.budgetedBase === null && lane.captureDate,
  );
  const [stillPending, setStillPending] = useState<number | null>(null);

  return (
    <View style={{ gap: 12 }}>
      <BudgetForm pocket={pocket} month={month} onDone={onDone} />
      <Button
        onPress={async () => {
          await send('budget/set-carryover', {
            startMonth: month,
            category: pocket.id,
            flag: !own?.carryover,
          });
          onDone();
        }}
      >
        {own?.carryover ? t('Turn rollover off') : t('Turn rollover on')}
      </Button>
      <TransferForm
        pocket={pocket}
        categoryId={categoryId}
        month={month}
        onDone={onDone}
      />
      {pocket.balance !== null && pocket.balance < 0 && (
        <CoverForm pocket={pocket} month={month} onDone={onDone} />
      )}
      {pending.length > 0 && (
        <Button
          onPress={async () => {
            const result = await send('budget/pockets-finalize', {
              cells: pending.map(lane => ({ month, laneId: lane.laneId })),
            });
            if (result.pending.length === 0) {
              onDone();
            } else {
              setStillPending(result.pending.length);
            }
          }}
        >
          <Trans>Finalize pending assignments</Trans>
        </Button>
      )}
      {stillPending !== null && (
        <Text role="status">
          {t(
            '{{count}} assignment is still pending: no exchange rate for its date.',
            { count: stillPending },
          )}
        </Text>
      )}
    </View>
  );
}

export function useStatusMessage() {
  const { t } = useTranslation();
  return (result: PocketWriteResult | PocketTransferResult) => {
    switch (result.status) {
      case 'ok':
        return null;
      case 'encoding-mismatch':
        return t(
          'The amount was read in another currency or precision. Enter it again.',
        );
      case 'pair-encoding-mismatch':
        return t(
          'An assignment in this slot is recorded in another currency. Enter it again first.',
        );
      case 'owner-unresolved':
        return t('This slot has no resolved owner.');
      case 'rate-unavailable':
        return t('No exchange rate is available for this date.');
      default:
        return null;
    }
  };
}

function BudgetForm({
  pocket,
  month,
  onDone,
}: {
  pocket: PocketMonth;
  month: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const message = useStatusMessage();
  const { currency, precision } = pocket;
  // The amount keeps the encoding it was read or typed at, whatever later
  // refreshes do to the slot's display precision.
  const [amount, setAmount] = useState(() =>
    requestAmount(pocket.budgeted, currency, precision),
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <ActionForm
      name={t('Edit {{currency}} budget', { currency })}
      error={error}
      onSubmit={async () => {
        if (amount === null) return;
        const result = await send('budget/pocket-budget-set', {
          month,
          pocketId: pocket.id,
          ...amount,
        });
        const text = message(result);
        if (text) setError(text);
        else onDone();
      }}
    >
      <AmountField
        label={t('Budgeted ({{currency}})', { currency })}
        currency={currency}
        precision={precision}
        initial={pocket.budgeted}
        onChange={(value, entered) =>
          setAmount(requestAmount(value, currency, entered))
        }
      />
      <Button type="submit" isDisabled={amount === null}>
        <Trans>Save budget</Trans>
      </Button>
    </ActionForm>
  );
}

/** Other slots of the same currency, by category name. */
function useSameCurrencySlots(pocket: PocketMonth, month: string) {
  const { data: categories } = useCategories();
  const name = (id: string) =>
    categories?.list.find(c => c.id === id)?.name ?? id;
  return [...useCategoryPockets(month)].flatMap(([category, entry]) =>
    entry.pockets
      .filter(p => p.currency === pocket.currency && p.id !== pocket.id)
      .map(p => ({ id: p.id, label: name(category) })),
  );
}

function TransferForm({ pocket, month, onDone }: PocketActionsProps) {
  const { t } = useTranslation();
  const message = useStatusMessage();
  const slots = useSameCurrencySlots(pocket, month);
  const [amount, setAmount] = useState<RequestAmount | null>(null);
  const [to, setTo] = useState('to-budget');
  const [error, setError] = useState<string | null>(null);
  const { currency, precision } = pocket;

  return (
    <ActionForm
      name={t('Transfer {{currency}}', { currency })}
      error={error}
      onSubmit={async () => {
        if (amount === null) return;
        const result = await send('budget/pocket-transfer', {
          month,
          from: pocket.id,
          to,
          amount,
        });
        const text = message(result);
        if (text) setError(text);
        else onDone();
      }}
    >
      <AmountField
        label={t('Amount ({{currency}})', { currency })}
        currency={currency}
        precision={precision}
        onChange={(value, entered) =>
          setAmount(requestAmount(value, currency, entered))
        }
      />
      <SelectField label={t('To')} value={to} onChange={setTo}>
        <option value="to-budget">{t('To Budget')}</option>
        {slots.map(slot => (
          <option key={slot.id} value={slot.id}>
            {t('{{category}} ({{currency}})', {
              category: slot.label,
              currency,
            })}
          </option>
        ))}
      </SelectField>
      <Button type="submit" isDisabled={amount === null}>
        <Trans>Transfer</Trans>
      </Button>
    </ActionForm>
  );
}

function CoverForm({
  pocket,
  month,
  onDone,
}: {
  pocket: PocketMonth;
  month: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const message = useStatusMessage();
  const [budgetCurrency] = useSyncedPref('defaultCurrencyCode');
  const { data: categories } = useCategories();
  const slots = useSameCurrencySlots(pocket, month);
  const { currency, precision } = pocket;
  const [native, setNative] = useState(() =>
    requestAmount(-(pocket.balance ?? 0), currency, precision),
  );
  const [from, setFrom] = useState('to-budget');
  // Asked for only when no exchange rate converts the covered amount.
  const [needsBase, setNeedsBase] = useState(false);
  const [base, setBase] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sameCurrency = slots.some(slot => slot.id === from);

  return (
    <ActionForm
      name={t('Cover {{currency}} overspending', { currency })}
      error={error}
      onSubmit={async () => {
        if (!native) return;
        const result = await send('budget/pocket-transfer', {
          month,
          from,
          to: pocket.id,
          ...(sameCurrency
            ? { amount: native }
            : {
                ...(needsBase && base !== null && { amount: base }),
                destinationAmount: native,
              }),
        });
        if (result.status === 'rate-unavailable') {
          setNeedsBase(true);
          setError(
            t(
              'No exchange rate is available for this date. Enter the amount in {{currency}}.',
              { currency: budgetCurrency || t('the budget currency') },
            ),
          );
          return;
        }
        const text = message(result);
        if (text) setError(text);
        else onDone();
      }}
    >
      <AmountField
        label={t('Amount ({{currency}})', { currency })}
        currency={currency}
        precision={precision}
        initial={native?.amount}
        onChange={(value, entered) =>
          setNative(requestAmount(value, currency, entered))
        }
      />
      <SelectField label={t('From')} value={from} onChange={setFrom}>
        <option value="to-budget">{t('To Budget')}</option>
        {categories?.list
          .filter(c => !c.is_income && !c.tombstone)
          .map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        {slots.map(slot => (
          <option key={slot.id} value={slot.id}>
            {t('{{category}} ({{currency}})', {
              category: slot.label,
              currency,
            })}
          </option>
        ))}
      </SelectField>
      {needsBase && (
        <AmountField
          label={t('Amount ({{currency}})', { currency: budgetCurrency })}
          onChange={setBase}
        />
      )}
      <Button type="submit" isDisabled={!native}>
        <Trans>Cover</Trans>
      </Button>
    </ActionForm>
  );
}

function ActionForm({
  name,
  error,
  onSubmit,
  children,
}: {
  name: string;
  error: string | null;
  onSubmit: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <form
      aria-label={name}
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      onSubmit={event => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <Text style={{ fontWeight: 600 }}>{name}</Text>
      {children}
      {error && (
        <Text role="alert" style={{ color: theme.errorText }}>
          {error}
        </Text>
      )}
    </form>
  );
}

/**
 * An amount input parsed at a currency's precision (the budget currency
 * when none is given). Reports null while the text is not an amount.
 */
function AmountField({
  currency,
  precision,
  ...props
}: {
  label: string;
  currency?: string;
  precision?: number;
  initial?: number | null;
  onChange: (value: number | null, precision: number) => void;
}) {
  if (!currency || precision === undefined) return <AmountInput {...props} />;
  return (
    <CurrencyFormatProvider currencyCode={currency} precision={precision}>
      <AmountInput {...props} />
    </CurrencyFormatProvider>
  );
}

function AmountInput({
  label,
  initial,
  onChange,
}: {
  label: string;
  initial?: number | null;
  /** The parsed integer and the precision it was parsed at, together. */
  onChange: (value: number | null, precision: number) => void;
}) {
  const format = useFormat();
  const [text, setText] = useState(
    initial == null ? '' : format.forEdit(initial),
  );
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Text>{label}</Text>
      <Input
        value={text}
        inputMode="decimal"
        onChangeValue={value => {
          setText(value);
          onChange(format.fromEdit(value), format.precision);
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Text>{label}</Text>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

/** An entered native amount with the encoding its integer was parsed at. */
function requestAmount(
  amount: number | null,
  currency: string,
  precision: number,
): RequestAmount | null {
  return amount === null
    ? null
    : { amount, encoding: `${currency}.${precision}` };
}
