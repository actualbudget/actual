// @ts-strict-ignore
import React, { type ComponentPropsWithoutRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { type AccountEntity } from 'loot-core/src/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { type BoundActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { useNavigate } from '../../hooks/useNavigate';
import { useResponsive } from '../../ResponsiveProvider';
import { CSSProperties, styles, theme } from '../../style';
import { AccountAutocomplete } from '../autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '../autocomplete/CategoryAutocomplete';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { type Input } from '../common/Input';
import { LinkButton } from '../common/LinkButton';
import { Modal } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { TapField } from '../mobile/MobileForms';
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
  const accounts = useAccounts().filter(a => a.closed === 0);
  const { grouped: categoryGroups, list: categories } = useCategories();
  const [loading, setLoading] = useState(false);
  const [transferAccountId, setTransferAccountId] = useState('');
  const transferAccount = accounts.find(a => a.id === transferAccountId);
  const [categoryId, setCategoryId] = useState('');
  const category = categories.find(c => c.id === categoryId);

  const [transferError, setTransferError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();

  const onSelectAccount = accId => {
    setTransferAccountId(accId);
    if (transferError && accId) {
      setTransferError(false);
    }
  };

  const onSelectCategory = catId => {
    setCategoryId(catId);
    if (categoryError && catId) {
      setCategoryError(false);
    }
  };

  const narrowStyle: CSSProperties = isNarrowWidth
    ? {
        userSelect: 'none',
        height: styles.mobileMinHeight,
        ...styles.mediumText,
      }
    : {};

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

              const transferError = balance !== 0 && transferAccountId === '';
              setTransferError(transferError);

              const categoryError =
                needsCategory(account, transferAccountId, accounts) &&
                categoryId === '';
              setCategoryError(categoryError);

              if (!transferError && !categoryError) {
                setLoading(true);

                actions
                  .closeAccount(
                    account.id,
                    transferAccountId || null,
                    categoryId || null,
                  )
                  .then(() => {
                    modalProps.onClose();
                    navigate(`accounts/${transferAccountId}`);
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
                    value={transferAccountId}
                    inputProps={{
                      placeholder: 'Select account...',
                      ...(isNarrowWidth && {
                        value: transferAccount?.name || '',
                        style: {
                          ...narrowStyle,
                        },
                        onClick: () => {
                          dispatch(
                            pushModal('account-autocomplete', {
                              includeClosedAccounts: false,
                              onSelect: onSelectAccount,
                            }),
                          );
                        },
                      }),
                    }}

                    onSelect={onSelectAccount}
                  />
                </View>

                {transferError && (
                  <FormError style={{ marginBottom: 15 }}>
                    Transfer is required
                  </FormError>
                )}

                {needsCategory(account, transferAccountId, accounts) && (
                  <View style={{ marginBottom: 15 }}>
                    <Paragraph>
                      Since you are transferring the balance from a budgeted
                      account to an off-budget account, this transaction must be
                      categorized. Select a category:
                    </Paragraph>

                    <CategoryAutocomplete
                      categoryGroups={categoryGroups}
                      value={categoryId}
                      inputProps={{
                        placeholder: 'Select category...',
                        ...(isNarrowWidth && {
                          value: category?.name || '',
                          style: {
                            ...narrowStyle,
                          },
                          onClick: () => {
                            dispatch(
                              pushModal('category-autocomplete', {
                                categoryGroups,
                                showHiddenCategories: true,
                                onSelect: onSelectCategory,
                              }),
                            );
                          },
                        }),
                      }}
                      onSelect={onSelectCategory}
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
              <Button
                style={{
                  marginRight: 10,
                  height: isNarrowWidth ? styles.mobileMinHeight : undefined,
                }}
                onClick={modalProps.onClose}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                style={{
                  height: isNarrowWidth ? styles.mobileMinHeight : undefined,
                }}
              >
                Close Account
              </Button>
            </View>
          </form>
        </View>
      )}
    </Modal>
  );
}
