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
import { currencies } from '@actual-app/core/shared/currencies';
import { toRelaxedNumber } from '@actual-app/core/shared/util';

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
import { validateAccountName } from '#components/util/accountValidation';
import { useAccounts } from '#hooks/useAccounts';
import { useNavigate } from '#hooks/useNavigate';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { closeModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type EnabledCurrency = {
  code: string;
  name?: string | null;
  is_base?: boolean;
};

export function CreateLocalAccountModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { data: accounts = [] } = useAccounts();
  const [defaultCurrencyCode] = useSyncedPref('defaultCurrencyCode');
  const [name, setName] = useState('');
  const [offbudget, setOffbudget] = useState(false);
  const [balance, setBalance] = useState('0');
  const [currency, setCurrency] = useState(defaultCurrencyCode || 'USD');
  const [enabledCurrencies, setEnabledCurrencies] = useState<EnabledCurrency[]>(
    [],
  );

  const [nameError, setNameError] = useState(null);
  const [balanceError, setBalanceError] = useState(false);
  const currencyOptions: [string, string][] =
    enabledCurrencies.length > 0
      ? enabledCurrencies.map(currency => [
          currency.code,
          `${currency.code} - ${currency.name ?? currency.code}`,
        ])
      : currencies
          .filter(option => option.code !== '')
          .map(option => [option.code, `${option.code} - ${option.name}`]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrencies() {
      const currencyRows = (await send('currencies-get')) as EnabledCurrency[];
      if (!isMounted) {
        return;
      }

      setEnabledCurrencies(currencyRows);
      const baseCurrency = currencyRows.find(currency => currency.is_base);
      if (baseCurrency) {
        setCurrency(baseCurrency.code);
      } else if (currencyRows.length > 0) {
        setCurrency(currentCurrency =>
          currencyRows.some(row => row.code === currentCurrency)
            ? currentCurrency
            : currencyRows[0].code,
        );
      }
    }

    void loadCurrencies();

    return () => {
      isMounted = false;
    };
  }, []);

  const validateBalance = balance => !isNaN(parseFloat(balance));

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

    const balanceError = !validateBalance(balance);
    setBalanceError(balanceError);

    if (!nameError && !balanceError) {
      createAccount.mutate(
        {
          name,
          balance: toRelaxedNumber(balance),
          offBudget: offbudget,
          currency,
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
              <ModalTitle title={t('Create Local Account')} shrinkOnOverflow />
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View>
            <Form onSubmit={onSubmit}>
              <InlineField label={t('Name')} width="100%">
                <InitialFocus>
                  <Input
                    name="name"
                    value={name}
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
                    <Text>
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

              <InlineField label={t('Balance')} width="100%">
                <Input
                  name="balance"
                  inputMode="decimal"
                  value={balance}
                  onChangeValue={setBalance}
                  onUpdate={value => {
                    const balance = value.trim();
                    setBalance(balance);
                    if (validateBalance(balance) && balanceError) {
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

              <InlineField label={t('Currency')} width="100%">
                <Select
                  value={currency}
                  onChange={setCurrency}
                  options={currencyOptions}
                  style={{ flex: 1 }}
                />
              </InlineField>

              <ModalButtons>
                <Button onPress={() => state.close()}>
                  <Trans>Back</Trans>
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
