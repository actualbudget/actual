import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { toRelaxedNumber } from 'loot-core/src/shared/util';

import { colors } from '../../style';
import {
  View,
  Modal,
  ModalButtons,
  Button,
  Input,
  InlineField,
  FormError,
  InitialFocus,
  Text,
  ExternalLink,
} from '../common';

function CreateLocalAccount({ modalProps, actions }) {
  let navigate = useNavigate();
  let [name, setName] = useState('');
  let [offbudget, setOffbudget] = useState(false);
  let [balance, setBalance] = useState('0');
  let [errors, setErrors] = useState({ name: false, balance: false });

  let validateBalance = balance => !isNaN(parseFloat(balance));

  return (
    <Modal title="Create Local Account" {...modalProps} showBack={false}>
      {() => (
        <View>
          <form
            onSubmit={async event => {
              event.preventDefault();
              const errors = { name: false, balance: false };
              if (!name) {
                errors.name = true;
              }
              if (!validateBalance(balance)) {
                errors.balance = true;
              }
              setErrors(errors);

              if (Object.keys(errors).length === 0) {
                modalProps.onClose();
                let id = await actions.createAccount(
                  name,
                  toRelaxedNumber(balance),
                  offbudget,
                );
                navigate('/accounts/' + id);
              }
            }}
          >
            <InlineField label="Name" width="75%">
              <InitialFocus>
                <Input
                  name="name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  onBlur={event => {
                    let name = event.target.value.trim();
                    setName(name);
                    if (name && errors.name) {
                      setErrors({ ...errors, name: false });
                    }
                  }}
                  style={{ flex: 1 }}
                />
              </InitialFocus>
            </InlineField>
            {errors.name && (
              <FormError style={{ marginLeft: 75 }}>Name is required</FormError>
            )}

            <View
              style={{
                width: '75%',
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <View style={{ flexDirection: 'column' }}>
                <label
                  style={{
                    userSelect: 'none',
                    textAlign: 'right',
                    width: '100%',
                    display: 'flex',
                    verticalAlign: 'center',
                    justifyContent: 'flex-end',
                  }}
                  htmlFor="offbudget"
                >
                  <input
                    id="offbudget"
                    name="offbudget"
                    type="checkbox"
                    checked={offbudget}
                    onChange={event => setOffbudget(event.target.checked)}
                  />
                  Off-budget
                </label>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '0.7em',
                    color: colors.n5,
                    marginTop: 3,
                  }}
                >
                  <Text>
                    This cannot be changed later. <br /> {'\n'}
                    See{' '}
                    <ExternalLink
                      linkColor="muted"
                      to="https://actualbudget.org/docs/accounts/#off-budget-accounts"
                    >
                      Accounts Overview
                    </ExternalLink>{' '}
                    for more information.
                  </Text>
                </div>
              </View>
            </View>

            <InlineField label="Balance" width="75%">
              <Input
                name="balance"
                value={balance}
                onChange={event => setBalance(event.target.value)}
                onBlur={event => {
                  let balance = event.target.value.trim();
                  setBalance(balance);
                  if (validateBalance(balance) && errors.balance) {
                    setErrors({ ...errors, balance: false });
                  }
                }}
                style={{ flex: 1 }}
              />
            </InlineField>
            {errors.balance && (
              <FormError style={{ marginLeft: 75 }}>
                Balance must be a number
              </FormError>
            )}

            <ModalButtons>
              <Button onClick={() => modalProps.onBack()} type="button">
                Back
              </Button>
              <Button primary style={{ marginLeft: 10 }}>
                Create
              </Button>
            </ModalButtons>
          </form>
        </View>
      )}
    </Modal>
  );
}

export default CreateLocalAccount;
