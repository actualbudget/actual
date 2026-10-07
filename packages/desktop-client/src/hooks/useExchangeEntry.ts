import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import type { SelectOption } from '@actual-app/components/select';
import { send } from '@actual-app/core/platform/client/connection';
import { nativeToBase, parseRate } from '@actual-app/core/shared/exchange-rate';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import {
  buildExchangeRequest,
  crossRate,
  impliedRate,
  isPayment,
  needsPrincipalCategory,
  otherAmountFromRate,
} from '#util/exchange-entry';
import type {
  ExchangeEntry,
  ExchangeEntryError,
  ExchangeRequest,
} from '#util/exchange-entry';

export type ExchangePostResult =
  | { status: 'ok' }
  | { status: 'rate-unavailable'; currencies: string[] }
  | { status: 'error'; error: string }
  /** A translated message the caller already chose. */
  | { status: 'message'; message: string }
  /** The user cancelled before anything was sent. */
  | { status: 'cancelled' }
  /** The edited exchange changed elsewhere; nothing more can be saved. */
  | { status: 'stale'; message: string };

/** A rate per base unit for an account's currency; '1' for base accounts. */
function useRatePerBase(
  account: Pick<AccountEntity, 'currency'>,
  date: string,
): string | null | undefined {
  const [rate, setRate] = useState<{ key: string; rate: string | null }>();
  const key = `${account.currency ?? ''}|${date}`;
  useEffect(() => {
    if (!account.currency) return;
    let cancelled = false;
    void send('exchange-rates/resolve', {
      quoteCurrency: account.currency,
      date,
    })
      .then(result => {
        if (!cancelled) {
          setRate({
            key,
            rate: result.status === 'resolved' ? result.rate : null,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setRate({ key, rate: null });
      });
    return () => {
      cancelled = true;
    };
  }, [account.currency, date, key]);
  if (!account.currency) return '1';
  return rate?.key === key ? rate.rate : undefined;
}

/** Stored values an exchange edit starts from, as typed text. */
export type ExchangeEntryInitial = {
  otherInput: string;
  feeInput: string;
  feeSide: 'register' | 'other';
  baseInput: string;
  category: string;
  feeCategory: string;
  /**
   * Whether the dialog may change the principal category: only from the
   * on-budget leg's side (MC-5.2 applies it to that side only).
   */
  categoryEditable: boolean;
};

/**
 * State and derived values for entering the other side of an exchange
 * transfer, shared by the desktop register panel, the mobile form and the
 * exchange edit dialog.
 */
export function useExchangeEntry({
  transaction,
  register,
  other,
  feeNeedsOtherAmount = false,
  initial,
}: {
  transaction: Pick<
    TransactionEntity,
    'amount' | 'date' | 'notes' | 'cleared' | 'category'
  >;
  register: AccountEntity;
  other: AccountEntity;
  /**
   * With a fee, the other amount must be typed, not derived from a rate: a
   * scheduled occurrence completed with a fee then holds entered amounts,
   * which imports never replace (MC-4.4).
   */
  feeNeedsOtherAmount?: boolean;
  /** An existing exchange being edited. */
  initial?: ExchangeEntryInitial;
}) {
  const { t } = useTranslation();
  const budgetPrecision = useAmountPrecision();
  const [defaultCurrency] = useSyncedPref('defaultCurrencyCode');
  const registerPrecision = register.currency_precision ?? budgetPrecision;
  const otherPrecision = other.currency_precision ?? budgetPrecision;
  const registerFormat = useFormat(registerPrecision);
  const otherFormat = useFormat(otherPrecision);
  const baseFormat = useFormat(budgetPrecision);
  const { data: categories } = useCategories();

  const [otherInput, setOtherInput] = useState(initial?.otherInput ?? '');
  const [rateInput, setRateInput] = useState('');
  const [feeInput, setFeeInput] = useState(initial?.feeInput ?? '');
  const [feeSide, setFeeSide] = useState<'register' | 'other'>(
    initial?.feeSide ?? 'register',
  );
  const [baseInput, setBaseInput] = useState(initial?.baseInput ?? '');
  // The principal's category belongs to its on-budget leg. In an on-budget
  // register that is the draft row, whose own category control is the only
  // one; an off-budget register has none, so the panel asks for it. Until
  // the user picks one, it follows the draft's category, which rules may
  // set after the panel opens.
  // An edit dialog has no draft row, so the panel holds the category.
  const draftOwnsCategory = !initial && !register.offbudget;
  const [chosenCategory, setCategory] = useState<string | null>(
    initial?.category ?? null,
  );
  const category = draftOwnsCategory
    ? (transaction.category ?? '')
    : (chosenCategory ?? transaction.category ?? '');
  const inFlight = useRef(false);
  const [feeCategory, setFeeCategory] = useState(initial?.feeCategory ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);

  const registerAmount = transaction.amount ?? 0;
  const payment = isPayment({ registerAmount });
  const [source, destination] = payment ? [register, other] : [other, register];
  const sourcePerBase = useRatePerBase(source, transaction.date);
  const destinationPerBase = useRatePerBase(destination, transaction.date);
  const estimatedRate = crossRate(
    sourcePerBase ?? null,
    destinationPerBase ?? null,
  );

  const currencyOf = (account: AccountEntity) =>
    account.currency ?? (defaultCurrency || '');
  const fee =
    (feeSide === 'register' ? registerFormat : otherFormat).fromEdit(
      feeInput,
    ) ?? null;
  // Text that does not parse is an error, never treated as blank.
  const feeInvalid = feeInput.trim() !== '' && fee == null;
  const entryBase = {
    register,
    other,
    registerAmount,
    fee: fee == null ? null : Math.abs(fee),
    feeSide,
  };

  let typedRate: string | null = null;
  if (rateInput.trim() !== '') {
    try {
      typedRate = parseRate(rateInput.trim());
    } catch {
      typedRate = null;
    }
  }
  const rateInvalid = rateInput.trim() !== '' && typedRate == null;
  const typedOther = otherFormat.fromEdit(otherInput);
  const otherInvalid = otherInput.trim() !== '' && typedOther == null;
  // The saved rate is used only when no rate is typed.
  const fromRate =
    otherInput.trim() === '' && !rateInvalid
      ? otherAmountFromRate(
          entryBase,
          typedRate ?? estimatedRate ?? '',
          budgetPrecision,
        )
      : null;
  const otherAmount =
    typedOther != null ? Math.abs(typedOther) : (fromRate ?? null);
  const isEstimate =
    otherInput.trim() === '' && rateInput.trim() === '' && fromRate != null;
  const shownRate =
    typedOther != null
      ? impliedRate({ ...entryBase, otherAmount }, budgetPrecision)
      : null;
  const bothForeign = !!register.currency && !!other.currency;
  const typedBase = baseFormat.fromEdit(baseInput);
  const baseInvalid = baseInput.trim() !== '' && typedBase == null;

  // Between two foreign accounts the principal's budget value is estimated
  // like the server does: the source currency's rate first, then the
  // destination's.
  let baseEstimate: number | null = null;
  if (bothForeign && otherAmount != null) {
    const fee = entryBase.fee ?? 0;
    const feeOnSource = (feeSide === 'register') === payment;
    const registerMagnitude = Math.abs(registerAmount);
    const sourceAmount = payment ? registerMagnitude : otherAmount;
    const destinationAmount = payment ? otherAmount : registerMagnitude;
    const principal = sourceAmount - (feeOnSource ? fee : 0);
    const gross = destinationAmount + (feeOnSource ? 0 : fee);
    try {
      if (sourcePerBase && principal > 0) {
        baseEstimate = nativeToBase(
          principal,
          source.currency_precision ?? budgetPrecision,
          budgetPrecision,
          sourcePerBase,
        );
      } else if (destinationPerBase && gross > 0) {
        baseEstimate = nativeToBase(
          gross,
          destination.currency_precision ?? budgetPrecision,
          budgetPrecision,
          destinationPerBase,
        );
      }
    } catch {
      baseEstimate = null;
    }
  }
  const baseValue =
    typedBase != null ? Math.abs(typedBase) : bothForeign ? baseEstimate : null;

  const entry: ExchangeEntry = {
    date: transaction.date,
    ...entryBase,
    otherAmount,
    baseValue,
    category: category || null,
    feeCategory: feeCategory || null,
    notes: transaction.notes ?? null,
    cleared: !!transaction.cleared,
  };

  const errorMessages: Record<ExchangeEntryError, string> = {
    'amount-required': t('Enter the amount of the transaction.'),
    'other-amount-required': payment
      ? t('Enter the amount received in {{account}}.', {
          account: other.name,
        })
      : t('Enter the amount sent from {{account}}.', { account: other.name }),
    'fee-invalid': t('Enter a valid fee.'),
  };
  const inputError = otherInvalid
    ? payment
      ? t('Enter a valid amount received.')
      : t('Enter a valid amount sent.')
    : rateInvalid
      ? t('Enter a valid rate.')
      : feeInvalid
        ? t('Enter a valid fee.')
        : feeNeedsOtherAmount && (entryBase.fee ?? 0) > 0 && typedOther == null
          ? errorMessages['other-amount-required']
          : baseInvalid
            ? t('Enter a valid value in {{base}}.', {
                base: defaultCurrency || '',
              })
            : bothForeign && baseValue == null
              ? t('Enter the value in {{base}}.', {
                  base: defaultCurrency || '',
                })
              : null;

  /** Posts the entry; resolves true once the transfer is saved. */
  async function post(
    onPost: (request: ExchangeRequest) => Promise<ExchangePostResult>,
  ): Promise<boolean> {
    // One submission at a time, whichever button or key started it.
    if (inFlight.current || stale) return false;
    if (inputError) {
      setMessage(inputError);
      return false;
    }
    const built = buildExchangeRequest(entry);
    if ('error' in built) {
      setMessage(errorMessages[built.error]);
      return false;
    }
    inFlight.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const result = await onPost(built.request);
      if (result.status === 'ok') return true;
      if (result.status === 'rate-unavailable') {
        setMessage(
          t(
            'No exchange rate is saved for {{currencies}} on this date. Enter the value in {{base}}.',
            {
              currencies: result.currencies.join(', '),
              base: defaultCurrency || '',
            },
          ),
        );
      } else if (result.status === 'stale') {
        setStale(true);
        setMessage(result.message);
      } else if (result.status === 'message') {
        setMessage(result.message);
      } else if (result.status === 'error') {
        setMessage(
          result.error === 'exchange-fee-invalid'
            ? t('The fee must be smaller than the amount transferred.')
            : t('This transfer could not be saved.'),
        );
      }
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const categoryItems: Array<SelectOption> = [];
  for (const group of categories?.grouped ?? []) {
    if (group.is_income) continue;
    categoryItems.push([Menu.label, group.name]);
    for (const cat of group.categories ?? []) {
      categoryItems.push([cat.id, cat.name]);
    }
  }
  const categoryOptions: Array<SelectOption> = [
    ['', t('None')],
    ...categoryItems,
  ];
  // The fee's empty choice names the field, since the select sits among
  // the panel's other inputs without its own label.
  const feeCategoryOptions: Array<SelectOption> = [
    ['', t('Fee category')],
    ...categoryItems,
  ];
  const feeAccount = feeSide === 'register' ? register : other;

  const estimateMessage = isEstimate
    ? payment
      ? t('The amount received is estimated from the saved rate {{rate}}.', {
          rate: Number(Number(estimatedRate).toPrecision(6)),
        })
      : t('The amount sent is estimated from the saved rate {{rate}}.', {
          rate: Number(Number(estimatedRate).toPrecision(6)),
        })
    : null;

  return {
    payment,
    source,
    destination,
    currencyOf,
    otherFormat,
    otherInput,
    setOtherInput: (value: string) => {
      setOtherInput(value);
      if (value.trim() !== '') setRateInput('');
    },
    rateInput,
    setRateInput: (value: string) => {
      setRateInput(value);
      if (value.trim() !== '') setOtherInput('');
    },
    feeInput,
    setFeeInput,
    feeSide,
    setFeeSide,
    baseInput,
    setBaseInput,
    category,
    setCategory,
    feeCategory,
    setFeeCategory,
    fee,
    feeAccount,
    fromRate,
    estimatedRate,
    baseEstimate,
    baseFormat,
    shownRate,
    bothForeign,
    needsCategory:
      (initial ? initial.categoryEditable : !draftOwnsCategory) &&
      needsPrincipalCategory({ register, other }),
    categoryOptions,
    feeCategoryOptions,
    defaultCurrency: defaultCurrency || '',
    message,
    estimateMessage,
    busy: busy || stale,
    post,
  };
}

export type ExchangeEntryState = ReturnType<typeof useExchangeEntry>;
