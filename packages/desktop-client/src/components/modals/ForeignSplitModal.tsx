import { useEffect, useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import type { SelectOption } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { nativeToBase } from '@actual-app/core/shared/exchange-rate';
import { q } from '@actual-app/core/shared/query';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import {
  RateField,
  rateInDirection,
  storedRate,
} from '#components/transactions/RateField';
import type { RateDirection } from '#components/transactions/RateField';
import { useAccounts } from '#hooks/useAccounts';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { removeModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';
import {
  confirmReconciledEdit,
  foreignEditErrorMessage,
  snapshotOf,
  staleEditMessage,
} from '#util/foreign-edit';

type ForeignSplitModalProps = Extract<
  ModalType,
  { name: 'foreign-split' }
>['options'];

type Child = {
  key: string;
  /** Absent for a child this save creates. */
  id?: string;
  amountInput: string;
  category: string;
  notes: string;
  /** The stored metadata, so only changed fields are sent. */
  original?: { category: string; notes: string };
};

/** Loads the transaction and any children as stored now. */
export function ForeignSplitModal({ id, onSaved }: ForeignSplitModalProps) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const [rows, setRows] = useState<TransactionEntity[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void aqlQuery(
      q('transactions')
        .filter({ $or: [{ id }, { parent_id: id }] })
        .select('*')
        .options({ splits: 'all' }),
    ).then(({ data }) => {
      if (!cancelled) setRows(data as TransactionEntity[]);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const parent = rows?.find(row => row.id === id);
  const account = accounts.find(a => a.id === parent?.account);
  return (
    <Modal name="foreign-split" containerProps={{ style: { width: 560 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Split transaction')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {rows &&
            (parent && account?.currency ? (
              <SplitForm
                parent={parent}
                storedChildren={rows.filter(row => row.parent_id === id)}
                account={account}
                onClose={() => state.close()}
                onSaved={onSaved}
              />
            ) : (
              <Text style={{ paddingBottom: 10 }}>
                <Trans>This transaction can no longer be split here.</Trans>
              </Text>
            ))}
        </>
      )}
    </Modal>
  );
}

function SplitForm({
  parent,
  storedChildren,
  account,
  onClose,
  onSaved,
}: {
  parent: TransactionEntity;
  storedChildren: TransactionEntity[];
  account: AccountEntity;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const precision = account.currency_precision ?? 0;
  const currencyCode = account.currency ?? '';
  const format = useFormat(precision);
  const basePrecision = useAmountPrecision();
  const baseFormat = useFormat(basePrecision);
  const { data: categories } = useCategories();
  const storedTotal = parent.transaction_amount ?? 0;
  const [totalInput, setTotalInput] = useState(format.forEdit(storedTotal));
  const [children, setChildren] = useState<Child[]>(() =>
    storedChildren.length > 0
      ? storedChildren.map(child => ({
          key: child.id,
          id: child.id,
          amountInput: format.forEdit(child.transaction_amount ?? 0),
          category: child.category ?? '',
          notes: child.notes ?? '',
          original: {
            category: child.category ?? '',
            notes: child.notes ?? '',
          },
        }))
      : [
          {
            key: 'new-0',
            amountInput: format.forEdit(storedTotal),
            category: parent.category ?? '',
            notes: '',
          },
          { key: 'new-1', amountInput: '', category: '', notes: '' },
        ],
  );
  const [baseInput, setBaseInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [rateDirection, setRateDirection] =
    useState<RateDirection>('foreign-per-base');
  const [savedRate, setSavedRate] = useState<string | null | undefined>();
  const [budgetCurrency] = useSyncedPref('defaultCurrencyCode');
  const [replaceRate, setReplaceRate] = useState(false);
  // A base the server computed for a typed rate, shown for confirmation.
  const [reviewedBase, setReviewedBase] = useState<{
    rate: string;
    baseAmount: number;
  } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void send('exchange-rates/resolve', {
      quoteCurrency: currencyCode,
      date: parent.date,
    }).then(result => {
      if (!cancelled) {
        setSavedRate(result.status === 'resolved' ? result.rate : null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currencyCode, parent.date]);

  const total = format.fromEdit(totalInput);
  const amounts = children.map(child =>
    child.amountInput.trim() === '' ? 0 : format.fromEdit(child.amountInput),
  );
  const invalid = total == null || amounts.some(amount => amount == null);
  const allocated = amounts.reduce<number>((sum, a) => sum + (a ?? 0), 0);
  const remaining = (total ?? 0) - allocated;
  const totalChanged = total != null && total !== storedTotal;
  const zeroTotal = total === 0;
  const offbudget = !!account.offbudget;

  let typedRate: string | null = null;
  try {
    typedRate =
      rateInput.trim() === '' ? null : storedRate(rateInput, rateDirection);
  } catch {
    typedRate = null;
  }
  const typedBase = baseFormat.fromEdit(baseInput);
  const conversionShown = totalChanged || zeroTotal;
  // Entered text that does not parse is an error, never treated as blank.
  const conversionInvalid =
    conversionShown &&
    ((rateInput.trim() !== '' && typedRate == null) ||
      (totalChanged &&
        !zeroTotal &&
        baseInput.trim() !== '' &&
        typedBase == null));
  // The rate the children of a zero total are valued at, as shown.
  const effectiveRate = typedRate ?? savedRate ?? null;
  // The saved rate, shown in the direction being typed.
  const ratePlaceholder = savedRate
    ? rateInDirection(savedRate, rateDirection)
    : undefined;
  // The parent's base, as shown; Save sends exactly this.
  let parentBase: number | null = parent.amount;
  if (totalChanged && total != null && !zeroTotal) {
    try {
      parentBase =
        baseInput.trim() !== '' && typedBase != null
          ? total < 0
            ? -Math.abs(typedBase)
            : Math.abs(typedBase)
          : typedRate && reviewedBase?.rate === typedRate
            ? reviewedBase.baseAmount
            : effectiveRate
              ? nativeToBase(total, precision, basePrecision, effectiveRate)
              : null;
    } catch {
      parentBase = null;
    }
  }
  const conversion =
    !conversionShown || total == null
      ? {}
      : // Every zero total values its children at the rate shown; a base
        // entered before the total became zero is hidden and ignored.
        zeroTotal
        ? effectiveRate
          ? { rate: effectiveRate }
          : null
        : parentBase == null
          ? null
          : typedRate && baseInput.trim() === ''
            ? // A typed rate is saved as the day's rate; the server checks
              // the base shown.
              { rate: typedRate, replaceRate, expectedBaseAmount: parentBase }
            : { baseAmount: parentBase };

  const categoryOptions: Array<SelectOption> = [['', t('None')]];
  for (const group of categories?.grouped ?? []) {
    categoryOptions.push([Menu.label, group.name]);
    for (const category of group.categories ?? []) {
      categoryOptions.push([category.id, category.name]);
    }
  }

  const update = (key: string, change: Partial<Child>) =>
    setChildren(current =>
      current.map(child =>
        child.key === key ? { ...child, ...change } : child,
      ),
    );

  const expected = Object.fromEntries(
    [parent, ...storedChildren].map(row => [row.id, snapshotOf(row)]),
  );
  const reconciled = [parent, ...storedChildren].some(row => row.reconciled);

  async function save() {
    if (invalid || conversionInvalid || total == null || remaining !== 0) {
      return;
    }
    if (conversion == null) {
      setMessage(
        zeroTotal
          ? t('Enter a rate to value the split amounts.')
          : t('Rate unavailable. Enter a base amount or rate.'),
      );
      return;
    }
    if (!(await confirmReconciledEdit(dispatch, reconciled))) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await send('transactions/save-foreign-split', {
        id: parent.id,
        expected,
        transaction_amount: total,
        children: children.map((child, index) => {
          const metadata = {
            ...((!child.original ||
              child.category !== child.original.category) && {
              category: offbudget ? null : child.category || null,
            }),
            ...((!child.original || child.notes !== child.original.notes) && {
              notes: child.notes || null,
            }),
          };
          return {
            ...(child.id && { id: child.id }),
            transaction_amount: amounts[index] ?? 0,
            ...metadata,
          };
        }),
        ...conversion,
      });
      switch (result.status) {
        case 'ok':
          dispatch(removeModal({ name: 'foreign-split' }));
          onSaved?.();
          return;
        case 'stale':
          setStale(true);
          setMessage(staleEditMessage(t));
          return;
        case 'rate-confirmation-required':
          setReplaceRate(true);
          setMessage(
            t(
              'A rate of 1 {{base}} = {{existing}} {{currency}} is already saved for this day. Confirm again to replace it with 1 {{base}} = {{rate}} {{currency}}.',
              {
                base: budgetCurrency,
                currency: currencyCode,
                existing: result.existing.rate,
                rate: typedRate,
              },
            ),
          );
          return;
        case 'base-changed':
          if (typedRate) {
            setReviewedBase({ rate: typedRate, baseAmount: result.baseAmount });
          }
          setMessage(
            t(
              'The converted amount changed to {{amount}}. Review it and confirm again.',
              { amount: baseFormat(result.baseAmount, 'financial') },
            ),
          );
          return;
        default:
          setMessage(t('Rate unavailable. Enter a base amount or rate.'));
      }
    } catch (error) {
      setMessage(foreignEditErrorMessage(t, error));
    } finally {
      setBusy(false);
    }
  }

  async function removeSplit() {
    if (!(await confirmReconciledEdit(dispatch, reconciled))) return;
    setBusy(true);
    try {
      const result = await send('transactions/collapse-foreign-split', {
        id: parent.id,
        expected,
      });
      if (result.status === 'stale') {
        setStale(true);
        setMessage(staleEditMessage(t));
        return;
      }
      dispatch(removeModal({ name: 'foreign-split' }));
      onSaved?.();
    } catch (error) {
      setMessage(foreignEditErrorMessage(t, error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      onSubmit={event => {
        event.preventDefault();
        void save();
      }}
    >
      <View style={{ gap: 10 }}>
        <InlineField
          label={t('Total ({{currency}})', { currency: currencyCode })}
          width="100%"
        >
          <Input
            aria-label={t('Total')}
            inputMode="decimal"
            value={totalInput}
            onChangeValue={setTotalInput}
            style={{ flex: 1 }}
          />
        </InlineField>
        {children.map((child, index) => (
          <View
            key={child.key}
            data-testid="foreign-split-child"
            style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}
          >
            <Input
              aria-label={t('Split amount {{number}}', { number: index + 1 })}
              inputMode="decimal"
              value={child.amountInput}
              onChangeValue={value => update(child.key, { amountInput: value })}
              style={{ width: 110 }}
            />
            {!offbudget && (
              <Select
                options={categoryOptions}
                value={child.category}
                defaultLabel={t('Category')}
                onChange={value => update(child.key, { category: value })}
              />
            )}
            <Input
              aria-label={t('Split notes {{number}}', { number: index + 1 })}
              placeholder={t('Notes')}
              value={child.notes}
              onChangeValue={value => update(child.key, { notes: value })}
              style={{ flex: 1 }}
            />
            <Button
              variant="bare"
              aria-label={t('Remove split {{number}}', { number: index + 1 })}
              isDisabled={children.length <= 1}
              onPress={() =>
                setChildren(current =>
                  current.filter(other => other.key !== child.key),
                )
              }
            >
              ×
            </Button>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Button
            onPress={() =>
              setChildren(current => [
                ...current,
                {
                  key: `new-${current.length}-${Date.now()}`,
                  amountInput: remaining !== 0 ? format.forEdit(remaining) : '',
                  category: '',
                  notes: '',
                },
              ])
            }
          >
            <Trans>Add split</Trans>
          </Button>
          <Text
            style={{
              color: remaining === 0 ? theme.pageTextSubdued : theme.errorText,
            }}
          >
            <Trans>
              {{ amount: format.forEdit(remaining) }}{' '}
              {{ currency: currencyCode }} left to allocate
            </Trans>
          </Text>
        </View>
        {zeroTotal ? (
          <>
            <Text style={{ color: theme.pageTextSubdued }}>
              <Trans>
                The total is zero, so each split is valued at the rate below.
              </Trans>
            </Text>
            <RateField
              name="rate"
              currencyCode={currencyCode}
              value={rateInput}
              placeholder={ratePlaceholder}
              direction={rateDirection}
              onChange={(value, direction) => {
                setRateInput(value);
                setRateDirection(direction);
                setReplaceRate(false);
              }}
            />
          </>
        ) : (
          totalChanged && (
            <>
              <Text style={{ color: theme.pageTextSubdued }}>
                {parentBase != null ? (
                  <Trans>
                    Base amount{' '}
                    {{ amount: baseFormat(parentBase, 'financial') }}, shared by
                    the splits in proportion.
                  </Trans>
                ) : (
                  <Trans>Rate unavailable. Enter a base amount or rate.</Trans>
                )}
              </Text>
              <InlineField label={t('Base amount')} width="100%">
                <Input
                  aria-label={t('Base amount')}
                  inputMode="decimal"
                  value={baseInput}
                  onChangeValue={setBaseInput}
                  style={{ flex: 1 }}
                />
              </InlineField>
              <RateField
                name="rate"
                currencyCode={currencyCode}
                value={rateInput}
                placeholder={ratePlaceholder}
                direction={rateDirection}
                onChange={(value, direction) => {
                  setRateInput(value);
                  setRateDirection(direction);
                  setReplaceRate(false);
                }}
              />
            </>
          )
        )}
        {message && <FormError>{message}</FormError>}
      </View>
      <ModalButtons>
        {storedChildren.length > 0 &&
          (confirmRemove ? (
            <Button
              variant="primary"
              isDisabled={busy || stale}
              onPress={() => void removeSplit()}
            >
              <Trans>Confirm removing the split</Trans>
            </Button>
          ) : (
            <Button
              isDisabled={busy || stale}
              onPress={() => setConfirmRemove(true)}
            >
              <Trans>Remove split</Trans>
            </Button>
          ))}
        <View style={{ flex: 1 }} />
        <Button isDisabled={busy} onPress={onClose}>
          <Trans>Cancel</Trans>
        </Button>
        <Button
          type="submit"
          variant="primary"
          isDisabled={
            busy || stale || invalid || conversionInvalid || remaining !== 0
          }
          style={{ marginLeft: 10 }}
        >
          <Trans>Save</Trans>
        </Button>
      </ModalButtons>
    </Form>
  );
}
