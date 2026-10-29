// @ts-strict-ignore
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import {
  isReviewedCurrency,
  reviewedAmountEncoding,
} from '@actual-app/core/shared/amount-encoding';
import { nativeToBase } from '@actual-app/core/shared/exchange-rate';
import { currentDay } from '@actual-app/core/shared/months';
import { integerToAmount } from '@actual-app/core/shared/util';

import { useCreateAccountMutation } from '#accounts';
import { Link } from '#components/common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import { useCurrencyOptions } from '#components/settings/Currency';
import { validateAccountName } from '#components/util/accountValidation';
import { useAccounts } from '#hooks/useAccounts';
import { useAmountPrecision } from '#hooks/useAmountPrecision';
import { useFormat } from '#hooks/useFormat';
import { useMulticurrencyAvailable } from '#hooks/useMulticurrencyAvailable';
import { useNavigate } from '#hooks/useNavigate';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { closeModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

export function CreateLocalAccountModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isUsingServer = useSyncServerStatus() !== 'no-server';
  const { data: accounts = [] } = useAccounts();
  const baseFormat = useFormat();
  const [name, setName] = useState('');
  const [offbudget, setOffbudget] = useState(false);
  const [balance, setBalance] = useState('0');
  const multicurrencyAvailable = useMulticurrencyAvailable();
  const [budgetCurrencyCode = ''] = useSyncedPref('defaultCurrencyCode');
  const currencyOptions = useCurrencyOptions().filter(([code]) =>
    isReviewedCurrency(code),
  );
  const [currency, setCurrency] = useState(budgetCurrencyCode);
  const isForeign =
    multicurrencyAvailable && !!currency && currency !== budgetCurrencyCode;
  // A foreign account's balance is entered in its own currency.
  const format = useFormat(
    isForeign ? reviewedAmountEncoding(currency).precision : undefined,
  );
  const encodedPreviewBalance = format.fromEdit(balance);
  const startingBase = useStartingBalanceBase({
    isEnabled: isForeign && !!encodedPreviewBalance,
    currency,
    nativeAmount: encodedPreviewBalance ?? 0,
    nativePrecision: format.precision,
  });
  const [baseInput, setBaseInput] = useState('');

  const [nameError, setNameError] = useState(null);
  const [balanceError, setBalanceError] = useState(false);
  const [baseError, setBaseError] = useState(false);

  const validateAndSetName = (name: string) => {
    const nameError = validateAccountName(name, '', accounts);
    if (nameError) {
      setNameError(nameError);
    } else {
      setName(name);
      setNameError(null);
    }
  };

  const createAccount = useCreateAccountMutation();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nameError = validateAccountName(name, '', accounts);

    const encodedBalance = format.fromEdit(balance);
    const balanceError = encodedBalance === null;
    setBalanceError(balanceError);

    // Without a saved rate, a foreign starting balance needs its base.
    const typedBase = baseInput.trim() ? baseFormat.fromEdit(baseInput) : null;
    const startingBalanceBase =
      typedBase == null || encodedBalance == null
        ? undefined
        : encodedBalance < 0
          ? -Math.abs(typedBase)
          : Math.abs(typedBase);
    const needsBase =
      isForeign &&
      !!encodedBalance &&
      // Still resolving, or no rate: a base must be known before creating.
      startingBase.status !== 'resolved' &&
      startingBalanceBase === undefined;
    setBaseError(needsBase);

    if (!nameError && encodedBalance !== null && !needsBase) {
      createAccount.mutate(
        {
          name,
          balance: integerToAmount(encodedBalance, format.precision),
          offBudget: offbudget,
          ...(multicurrencyAvailable && {
            currency: isForeign ? currency : budgetCurrencyCode,
          }),
          ...(isForeign &&
            startingBalanceBase !== undefined && {
              startingBalanceBase,
            }),
        },
        {
          onSuccess: id => {
            dispatch(closeModal());
            void navigate('/accounts/' + id);
          },
        },
      );
    }
  };
  return (
    <Modal name="add-local-account">
      {({ state }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle
                title={
                  isUsingServer ? t('Create Local Account') : t('Add account')
                }
                shrinkOnOverflow
              />
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View>
            {!isUsingServer && (
              <Text
                style={{
                  color: theme.pageTextSubdued,
                  lineHeight: 1.5,
                  marginBottom: 15,
                }}
              >
                <Trans>
                  Once the account is created, you can also{' '}
                  <Link
                    variant="external"
                    linkColor="muted"
                    to="https://actualbudget.org/docs/transactions/importing"
                  >
                    import QIF/OFX/QFX files
                  </Link>{' '}
                  into it.
                </Trans>
              </Text>
            )}
            <Form onSubmit={onSubmit}>
              <InlineField label={t('Name')} width="100%">
                <InitialFocus>
                  <Input
                    name="name"
                    value={name}
                    placeholder={t('e.g. Bank, Savings, Credit Card, Cash')}
                    onChangeValue={setName}
                    onUpdate={value => {
                      const name = value.trim();
                      validateAndSetName(name);
                    }}
                    style={{ flex: 1 }}
                  />
                </InitialFocus>
              </InlineField>
              {nameError && (
                <FormError style={{ marginLeft: 75, color: theme.warningText }}>
                  {nameError}
                </FormError>
              )}

              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                }}
              >
                <View style={{ flexDirection: 'column' }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Checkbox
                      id="offbudget"
                      name="offbudget"
                      checked={offbudget}
                      onChange={() => setOffbudget(!offbudget)}
                    />
                    <label
                      htmlFor="offbudget"
                      style={{
                        userSelect: 'none',
                        verticalAlign: 'center',
                      }}
                    >
                      <Trans>Off budget</Trans>
                    </label>
                  </View>
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: '0.7em',
                      color: theme.pageTextLight,
                      marginTop: 3,
                    }}
                  >
                    <Text style={{ display: 'block' }}>
                      <Trans>
                        Off-budget accounts (like investments, loans, or your
                        house) are tracked but not part of your spending budget.
                      </Trans>
                    </Text>
                    <Text style={{ display: 'block' }}>
                      <Trans>
                        This cannot be changed later. See{' '}
                        <Link
                          variant="external"
                          linkColor="muted"
                          to="https://actualbudget.org/docs/accounts/#off-budget-accounts"
                        >
                          Accounts Overview
                        </Link>{' '}
                        for more information.
                      </Trans>
                    </Text>
                  </div>
                </View>
              </View>

              {multicurrencyAvailable && (
                <InlineField label={t('Currency')} width="100%">
                  <Select
                    id="account-currency-select"
                    value={currency || budgetCurrencyCode}
                    options={currencyOptions}
                    onChange={value => {
                      setCurrency(value);
                      setBaseInput('');
                      setBaseError(false);
                    }}
                    style={{ flex: 1 }}
                  />
                </InlineField>
              )}

              <InlineField label={t('Balance')} width="100%">
                <Input
                  name="balance"
                  inputMode="decimal"
                  value={balance}
                  onChangeValue={setBalance}
                  onUpdate={value => {
                    const balance = value.trim();
                    setBalance(balance);
                    if (format.fromEdit(balance) !== null && balanceError) {
                      setBalanceError(false);
                    }
                  }}
                  style={{ flex: 1 }}
                />
              </InlineField>
              {balanceError && (
                <FormError style={{ marginLeft: 75 }}>
                  <Trans>Balance must be a number</Trans>
                </FormError>
              )}
              {isForeign &&
                !!encodedPreviewBalance &&
                startingBase.status === 'resolved' && (
                  <Text
                    style={{
                      marginLeft: 75,
                      fontSize: '0.85em',
                      color: theme.pageTextSubdued,
                    }}
                  >
                    <Trans>
                      {{
                        amount: baseFormat(
                          startingBase.baseAmount,
                          'financial',
                        ),
                      }}{' '}
                      in the budget currency, at 1{' '}
                      {{ base: budgetCurrencyCode }} ={' '}
                      {{ rate: startingBase.rate }} {{ currency }}
                    </Trans>
                  </Text>
                )}
              {isForeign &&
                !!encodedPreviewBalance &&
                startingBase.status === 'unavailable' && (
                  <>
                    <InlineField label={t('Base amount')} width="100%">
                      <Input
                        name="startingBalanceBase"
                        inputMode="decimal"
                        value={baseInput}
                        onChangeValue={value => {
                          setBaseInput(value);
                          setBaseError(false);
                        }}
                        style={{ flex: 1 }}
                      />
                    </InlineField>
                    <Text
                      style={{
                        marginLeft: 75,
                        fontSize: '0.85em',
                        color: baseError
                          ? theme.errorText
                          : theme.pageTextLight,
                      }}
                    >
                      <Trans>
                        No exchange rate is saved for today. Enter the starting
                        balance in the budget currency.
                      </Trans>
                    </Text>
                  </>
                )}

              <ModalButtons>
                <Button onPress={() => state.close()}>
                  {isUsingServer ? <Trans>Back</Trans> : <Trans>Cancel</Trans>}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{ marginLeft: 10 }}
                >
                  <Trans>Create</Trans>
                </Button>
              </ModalButtons>
            </Form>
          </View>
        </>
      )}
    </Modal>
  );
}

type StartingBase =
  | { status: 'resolved'; baseAmount: number; rate: string }
  | { status: 'unavailable' }
  | { status: 'idle' };

/** The converted starting balance at today's rate, when one is saved. */
function useStartingBalanceBase({
  isEnabled,
  currency,
  nativeAmount,
  nativePrecision,
}: {
  isEnabled: boolean;
  currency: string;
  nativeAmount: number;
  nativePrecision: number;
}): StartingBase {
  const basePrecision = useAmountPrecision();
  const [resolution, setResolution] = useState<{
    currency: string;
    rate: string | null;
  } | null>(null);

  useEffect(() => {
    if (!isEnabled) return;
    let cancelled = false;
    void send('exchange-rates/resolve', {
      quoteCurrency: currency,
      date: currentDay(),
    }).then(result => {
      if (!cancelled) {
        setResolution({
          currency,
          rate: result.status === 'resolved' ? result.rate : null,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isEnabled, currency]);

  if (!isEnabled || resolution?.currency !== currency) {
    return { status: 'idle' };
  }
  if (resolution.rate == null) return { status: 'unavailable' };
  try {
    return {
      status: 'resolved',
      rate: resolution.rate,
      baseAmount: nativeToBase(
        nativeAmount,
        nativePrecision,
        basePrecision,
        resolution.rate,
      ),
    };
  } catch {
    return { status: 'unavailable' };
  }
}
