import React, { useState } from 'react';

import { integerToCurrency } from 'loot-core/src/shared/util';

import { colors } from '../../style';
import AccountAutocomplete from '../autocomplete/AccountAutocomplete';
import CategoryAutocomplete from '../autocomplete/CategorySelect';
import { P, LinkButton } from '../common';
import Button from '../common/Button';
import FormError from '../common/FormError';
import Modal from '../common/Modal';
import Text from '../common/Text';
import View from '../common/View';

function needsCategory(account, currentTransfer, accounts) {
  const acct = accounts.find(a => a.id === currentTransfer);
  const isOffBudget = acct && acct.offbudget === 1;

  // The user must select a category if transferring from a budgeted
  // account to an off-budget account
  return account.offbudget === 0 && isOffBudget;
}

function CloseAccount({
  account,
  accounts,
  categoryGroups,
  balance,
  canDelete,
  actions,
  modalProps,
}) {
  let [loading, setLoading] = useState(false);
  let [transfer, setTransfer] = useState('');
  let [category, setCategory] = useState('');

  let [transferError, setTransferError] = useState(false);
  let [categoryError, setCategoryError] = useState(false);

  return (
    <Modal
      title="Close Account"
      {...modalProps}
      style={{ flex: 0 }}
      loading={loading}
    >
      {() => (
        <View>
          <P>
            Are you sure you want to close <strong>{account.name}</strong>?{' '}
            {canDelete ? (
              <span>
                This account has no transactions so it will be permanently
                deleted.
              </span>
            ) : (
              <span>
                This account has transactions so we can’t permanently delete it.
              </span>
            )}
          </P>
          <form
            onSubmit={event => {
              event.preventDefault();

              let transferError = balance !== 0 && transfer === '';
              setTransferError(transferError);

              let categoryError =
                needsCategory(account, transfer, accounts) && category === '';
              setCategoryError(categoryError);

              if (!transferError && !categoryError) {
                setLoading(true);

                actions
                  .closeAccount(account.id, transfer || null, category || null)
                  .then(() => {
                    modalProps.onClose();
                  });
              }
            }}
          >
            {balance !== 0 && (
              <View>
                <P>
                  This account has a balance of{' '}
                  <strong>{integerToCurrency(balance)}</strong>. To close this
                  account, select a different account to transfer this balance
                  to:
                </P>

                <View style={{ marginBottom: 15 }}>
                  <AccountAutocomplete
                    includeClosedAccounts={false}
                    value={transfer}
                    accounts={accounts}
                    inputProps={{
                      placeholder: 'Select account...',
                    }}
                    onSelect={acc => {
                      setTransfer(acc);
                      if (transferError && acc) {
                        setTransferError(false);
                      }
                    }}
                  />
                </View>

                {transferError && (
                  <FormError style={{ marginBottom: 15 }}>
                    Transfer is required
                  </FormError>
                )}

                {needsCategory(account, transfer, accounts) && (
                  <View style={{ marginBottom: 15 }}>
                    <P>
                      Since you are transferring the balance from a budgeted
                      account to an off-budget account, this transaction must be
                      categorized. Select a category:
                    </P>

                    <CategoryAutocomplete
                      categoryGroups={categoryGroups}
                      value={category}
                      inputProps={{
                        placeholder: 'Select category...',
                      }}
                      onSelect={newValue => {
                        setCategory(newValue);
                        if (categoryError && newValue) {
                          setCategoryError(false);
                        }
                      }}
                    />

                    {categoryError && (
                      <FormError>Category is required</FormError>
                    )}
                  </View>
                )}
              </View>
            )}

            {!canDelete && (
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 12 }}>
                  You can also{' '}
                  <LinkButton
                    onClick={() => {
                      setLoading(true);

                      actions
                        .forceCloseAccount(account.id)
                        .then(() => modalProps.onClose());
                    }}
                    style={{ color: colors.r6 }}
                  >
                    force close
                  </LinkButton>{' '}
                  the account which will delete it and all its transactions
                  permanently. Doing so may change your budget unexpectedly
                  since money in it may vanish.
                </Text>
              </View>
            )}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                type="submit"
                style={{ marginRight: 10 }}
                onClick={modalProps.onClose}
              >
                Cancel
              </Button>
              <Button type="submit" primary>
                Close Account
              </Button>
            </View>
          </form>
        </View>
      )}
    </Modal>
  );
}

export default CloseAccount;
