// @ts-strict-ignore
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { createAccount } from 'loot-core/client/actions';
import { toRelaxedNumber } from 'loot-core/src/shared/util';

import { useNavigate } from '../../hooks/useNavigate';
import { theme } from '../../style';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { InitialFocus } from '../common/InitialFocus';
import { InlineField } from '../common/InlineField';
import { Input } from '../common/Input';
import { Link } from '../common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal2';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox } from '../forms';

export function CreateLocalAccountModal() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [offbudget, setOffbudget] = useState(false);
  const [balance, setBalance] = useState('0');

  const [nameError, setNameError] = useState(false);
  const [balanceError, setBalanceError] = useState(false);

  const validateBalance = balance => !isNaN(parseFloat(balance));

  return (
    <Modal name="add-local-account">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title="Create Local Account" shrinkOnOverflow />}
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <View>
            <form
              onSubmit={async event => {
                event.preventDefault();

                const nameError = !name;
                setNameError(nameError);

                const balanceError = !validateBalance(balance);
                setBalanceError(balanceError);

                if (!nameError && !balanceError) {
                  close();
                  const id = await dispatch(
                    createAccount(name, toRelaxedNumber(balance), offbudget),
                  );
                  navigate('/accounts/' + id);
                }
              }}
            >
              <InlineField label="Name" width="100%">
                <InitialFocus>
                  <Input
                    name="name"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    onBlur={event => {
                      const name = event.target.value.trim();
                      setName(name);
                      if (name && nameError) {
                        setNameError(false);
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                </InitialFocus>
              </InlineField>
              {nameError && (
                <FormError style={{ marginLeft: 75 }}>
                  Name is required
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
                      Off-budget
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
                      This cannot be changed later. <br /> {'\n'}
                      See{' '}
                      <Link
                        variant="external"
                        linkColor="muted"
                        to="https://actualbudget.org/docs/accounts/#off-budget-accounts"
                      >
                        Accounts Overview
                      </Link>{' '}
                      for more information.
                    </Text>
                  </div>
                </View>
              </View>

              <InlineField label="Balance" width="100%">
                <Input
                  name="balance"
                  inputMode="decimal"
                  value={balance}
                  onChange={event => setBalance(event.target.value)}
                  onBlur={event => {
                    const balance = event.target.value.trim();
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
                  Balance must be a number
                </FormError>
              )}

              <ModalButtons>
                <Button onClick={close}>Back</Button>
                <Button type="primary" style={{ marginLeft: 10 }}>
                  Create
                </Button>
              </ModalButtons>
            </form>
          </View>
        </>
      )}
    </Modal>
  );
}
