import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { toRelaxedNumber } from 'loot-core/src/shared/util';

import { theme } from '../../style';
import Button from '../common/Button';
import ExternalLink from '../common/ExternalLink';
import FormError from '../common/FormError';
import InitialFocus from '../common/InitialFocus';
import InlineField from '../common/InlineField';
import Input from '../common/Input';
import Modal, { ModalButtons } from '../common/Modal';
import Text from '../common/Text';
import View from '../common/View';

function CreateLocalAccount({ modalProps, actions }) {
  let navigate = useNavigate();
  let [name, setName] = useState('');
  let [offbudget, setOffbudget] = useState(false);
  let [balance, setBalance] = useState('0');

  let [nameError, setNameError] = useState(false);
  let [balanceError, setBalanceError] = useState(false);

  let validateBalance = balance => !isNaN(parseFloat(balance));

  return (
    <Modal title="Create Local Account" {...modalProps} showBack={false}>
      {() => (
        <View>
          <form
            onSubmit={async event => {
              event.preventDefault();

              let nameError = !name;
              setNameError(nameError);

              let balanceError = !validateBalance(balance);
              setBalanceError(balanceError);

              if (!nameError && !balanceError) {
                actions.closeModal();
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
                    if (name && nameError) {
                      setNameError(false);
                    }
                  }}
                  style={{ flex: 1 }}
                />
              </InitialFocus>
            </InlineField>
            {nameError && (
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
                    color: theme.altpageTextSubdued,
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
              <Button onClick={() => modalProps.onBack()}>Back</Button>
              <Button type="primary" style={{ marginLeft: 10 }}>
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
