// @ts-strict-ignore
import { type FormEvent, useState } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { InlineField } from '@actual-app/components/inline-field';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { toRelaxedNumber } from 'loot-core/shared/util';

import { createAccount } from '@desktop-client/accounts/accountsSlice';
import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { Checkbox } from '@desktop-client/components/forms';
import { validateAccountName } from '@desktop-client/components/util/accountValidation';
import { MoneyKeypad } from '@desktop-client/components/util/MoneyKeypad';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useIsMobileCalculatorKeypadEnabled } from '@desktop-client/hooks/useIsMobileCalculatorKeypadEnabled';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { closeModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';
import { parseAmountExpression } from '@desktop-client/util/parseAmountExpression';

export function CreateLocalAccountModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const accounts = useAccounts();
  const isMobileKeypadEnabled = useIsMobileCalculatorKeypadEnabled();
  const [name, setName] = useState('');
  const [offbudget, setOffbudget] = useState(false);
  const [balance, setBalance] = useState('0');
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [didCommitFromKeypad, setDidCommitFromKeypad] = useState(false);

  const [nameError, setNameError] = useState(null);
  const [balanceError, setBalanceError] = useState(false);

  const parseBalance = (balance: string): number | null => {
    return parseAmountExpression(balance);
  };

  const validateBalance = (balance: string) => {
    return parseBalance(balance) != null;
  };

  const validateAndSetName = (name: string) => {
    const nameError = validateAccountName(name, '', accounts);
    if (nameError) {
      setNameError(nameError);
    } else {
      setName(name);
      setNameError(null);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nameError = validateAccountName(name, '', accounts);

    const balanceError = !validateBalance(balance);
    setBalanceError(balanceError);

    if (!nameError && !balanceError) {
      dispatch(closeModal());
      const id = await dispatch(
        createAccount({
          name,
          balance: toRelaxedNumber(balance),
          offBudget: offbudget,
        }),
      ).unwrap();
      navigate('/accounts/' + id);
    }
  };
  return (
    <Modal name="add-local-account">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle title={t('Create Local Account')} shrinkOnOverflow />
            }
            rightContent={<ModalCloseButton onPress={close} />}
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
                  inputMode={isMobileKeypadEnabled ? 'none' : 'decimal'}
                  value={balance}
                  onChangeValue={setBalance}
                  onPointerDown={() => {
                    if (isMobileKeypadEnabled) {
                      setDidCommitFromKeypad(false);
                      setIsKeypadOpen(true);
                    }
                  }}
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
              {isMobileKeypadEnabled && isKeypadOpen && (
                <MoneyKeypad
                  modalName="money-keypad"
                  title={t('Balance')}
                  defaultValue={balance}
                  onChangeValue={setBalance}
                  onClose={() => {
                    setIsKeypadOpen(false);
                    if (!didCommitFromKeypad) {
                      return;
                    }
                    setDidCommitFromKeypad(false);
                  }}
                  onEvaluate={text => {
                    const numericValue = parseBalance(text);
                    if (numericValue == null) {
                      return {
                        ok: false as const,
                        error: t('Invalid expression'),
                      };
                    }

                    return { ok: true as const, value: String(numericValue) };
                  }}
                  onDone={text => {
                    const numericValue = parseBalance(text);
                    if (numericValue == null) {
                      return {
                        ok: false as const,
                        error: t('Invalid expression'),
                      };
                    }

                    setBalance(String(numericValue));
                    setDidCommitFromKeypad(true);
                    setIsKeypadOpen(false);
                    if (balanceError) {
                      setBalanceError(false);
                    }

                    return { ok: true as const, value: undefined };
                  }}
                />
              )}
              {balanceError && (
                <FormError style={{ marginLeft: 75 }}>
                  <Trans>Balance must be a number</Trans>
                </FormError>
              )}

              <ModalButtons>
                <Button onPress={close}>
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
