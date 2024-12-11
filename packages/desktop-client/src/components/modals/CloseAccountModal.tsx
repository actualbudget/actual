// @ts-strict-ignore
import React, { type FormEvent, useState, type CSSProperties } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { useDispatch } from 'react-redux';

import {
  closeAccount,
  forceCloseAccount,
  pushModal,
} from 'loot-core/client/actions';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { type AccountEntity } from 'loot-core/src/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { styles, theme } from '../../style';
import { AccountAutocomplete } from '../autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '../autocomplete/CategoryAutocomplete';
import { Button } from '../common/Button2';
import { FormError } from '../common/FormError';
import { Link } from '../common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useResponsive } from '../responsive/ResponsiveProvider';

function needsCategory(
  account: AccountEntity,
  currentTransfer: string,
  accounts: AccountEntity[],
) {
  const acct = accounts.find(a => a.id === currentTransfer);
  const isOffBudget = acct && acct.offbudget === 1;

  // The user must select a category if transferring from a budgeted
  // account to an off budget account
  return account.offbudget === 0 && isOffBudget;
}

type CloseAccountModalProps = {
  account: AccountEntity;
  balance: number;
  canDelete: boolean;
};

export function CloseAccountModal({
  account,
  balance,
  canDelete,
}: CloseAccountModalProps) {
  const { t } = useTranslation(); // Initialize translation hook
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const transferError = balance !== 0 && transferAccountId === '';
    setTransferError(transferError);

    const categoryError =
      needsCategory(account, transferAccountId, accounts) && categoryId === '';
    setCategoryError(categoryError);

    if (!transferError && !categoryError) {
      setLoading(true);

      dispatch(
        closeAccount(account.id, transferAccountId || null, categoryId || null),
      );
    }
  };

  return (
    <Modal
      name="close-account"
      isLoading={loading}
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Close Account')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View>
            <Paragraph>
              {t('Are you sure you want to close ')}
              <strong>{account.name}</strong>?{' '}
              {canDelete ? (
                <span>
                  This account has no transactions so it will be permanently
                  deleted.
                </span>
              ) : (
                <span>
                  This account has transactions so we can’t permanently delete
                  it.
                </span>
              )}
            </Paragraph>
            <Form
              onSubmit={e => {
                onSubmit(e);
                close();
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
                        placeholder: t('Select account...'),
                        autoFocus: true,
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
                      {t('Transfer is required')}
                    </FormError>
                  )}

                  {needsCategory(account, transferAccountId, accounts) && (
                    <View style={{ marginBottom: 15 }}>
                      <Paragraph>
                        Since you are transferring the balance from an on budget
                        account to an off budget account, this transaction must
                        be categorized. Select a category:
                      </Paragraph>

                      <CategoryAutocomplete
                        categoryGroups={categoryGroups}
                        value={categoryId}
                        inputProps={{
                          placeholder: t('Select category...'),
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
                        <FormError>{t('Category is required')}</FormError>
                      )}
                    </View>
                  )}
                </View>
              )}

              {!canDelete && (
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 12 }}>
                    {t('You can also')}{' '}
                    <Link
                      variant="text"
                      onClick={() => {
                        setLoading(true);

                        dispatch(forceCloseAccount(account.id));
                        close();
                      }}
                      style={{ color: theme.errorText }}
                    >
                      {t('force close')}
                    </Link>{' '}
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
                  onPress={close}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{
                    height: isNarrowWidth ? styles.mobileMinHeight : undefined,
                  }}
                >
                  {t('Close Account')}
                </Button>
              </View>
            </Form>
          </View>
        </>
      )}
    </Modal>
  );
}
