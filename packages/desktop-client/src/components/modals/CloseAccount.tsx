// @ts-strict-ignore
import React, { useState } from 'react';

import { integerToCurrency } from 'loot-core/src/shared/util';
import { type AccountEntity } from 'loot-core/src/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { type BoundActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { theme } from '../../style';
import { AccountAutocomplete } from '../autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '../autocomplete/CategoryAutocomplete';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { LinkButton } from '../common/LinkButton';
import { Modal } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';

function needsCategory(
  account: AccountEntity,
  currentTransfer: string,
  accounts: AccountEntity[],
) {
  const acct = accounts.find(a => a.id === currentTransfer);
  const isOffBudget = acct && acct.offbudget === 1;

  // The user must select a category if transferring from a budgeted
  // account to an off-budget account
  return account.offbudget === 0 && isOffBudget;
}

type CloseAccountProps = {
  account: AccountEntity;
  balance: number;
  canDelete: boolean;
  actions: BoundActions;
  modalProps: CommonModalProps;
};

export function CloseAccount({
  account,
  balance,
  canDelete,
  actions,
  modalProps,
}: CloseAccountProps) {
  const [loading, setLoading] = useState(false);
  const [transfer, setTransfer] = useState('');
  const [category, setCategory] = useState('');

  const [transferError, setTransferError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const accounts = useAccounts().filter(a => a.closed === 0);
  const { grouped: categoryGroups } = useCategories();

  return (
    <Modal
      title="Close Account"
      {...modalProps}
      style={{ flex: 0 }}
      loading={loading}
    >
      {() => (
        <View>
          <Paragraph>
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
          </Paragraph>
          <form
            onSubmit={event => {
              event.preventDefault();

              const transferError = balance !== 0 && transfer === '';
              setTransferError(transferError);

              const categoryError =
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
                <Paragraph>
                  This account has a balance of{' '}
                  <strong>{integerToCurrency(balance)}</strong>. To close this
                  account, select a different account to transfer this balance
                  to:
                </Paragraph>

                <View style={{ marginBottom: 15 }}>
                  <AccountAutocomplete
                    includeClosedAccounts={false}
                    value={transfer}
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
                    <Paragraph>
                      Since you are transferring the balance from a budgeted
                      account to an off-budget account, this transaction must be
                      categorized. Select a category:
                    </Paragraph>

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
                      showHiddenCategories={true}
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
                    style={{ color: theme.errorText }}
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
              <Button style={{ marginRight: 10 }} onClick={modalProps.onClose}>
                Cancel
              </Button>
              <Button type="primary">Close Account</Button>
            </View>
          </form>
        </View>
      )}
    </Modal>
  );
}
