// @ts-strict-ignore
import React, { type FormEvent, useState, type CSSProperties } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation, Trans } from 'react-i18next';

import {
  type Modal as ModalType,
  pushModal,
} from 'loot-core/client/modals/modalsSlice';
import { closeAccount } from 'loot-core/client/queries/queriesSlice';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { type AccountEntity } from 'loot-core/src/types/models';
import { type TransObjectLiteral } from 'loot-core/types/util';

import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useDispatch } from '../../redux';
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

type CloseAccountModalProps = Extract<
  ModalType,
  { name: 'close-account' }
>['options'];

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
        closeAccount({
          id: account.id,
          transferAccountId: transferAccountId || null,
          categoryId: categoryId || null,
        }),
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
              <Trans>
                Are you sure you want to close{' '}
                <strong>
                  {{ accountName: account.name } as TransObjectLiteral}
                </strong>
                ?{' '}
              </Trans>
              {canDelete ? (
                <span>
                  <Trans>
                    This account has no transactions so it will be permanently
                    deleted.
                  </Trans>
                </span>
              ) : (
                <span>
                  <Trans>
                    This account has transactions so we can’t permanently delete
                    it.
                  </Trans>
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
                    <Trans>
                      This account has a balance of{' '}
                      <strong>
                        {
                          {
                            balance: integerToCurrency(balance),
                          } as TransObjectLiteral
                        }
                      </strong>
                      . To close this account, select a different account to
                      transfer this balance to:
                    </Trans>
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
                              pushModal({
                                modal: {
                                  name: 'account-autocomplete',
                                  options: {
                                    includeClosedAccounts: false,
                                    onSelect: onSelectAccount,
                                  },
                                },
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
                      <Trans>Transfer is required</Trans>
                    </FormError>
                  )}

                  {needsCategory(account, transferAccountId, accounts) && (
                    <View style={{ marginBottom: 15 }}>
                      <Paragraph>
                        <Trans>
                          Since you are transferring the balance from an on
                          budget account to an off budget account, this
                          transaction must be categorized. Select a category:
                        </Trans>
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
                                pushModal({
                                  modal: {
                                    name: 'category-autocomplete',
                                    options: {
                                      categoryGroups,
                                      showHiddenCategories: true,
                                      onSelect: onSelectCategory,
                                    },
                                  },
                                }),
                              );
                            },
                          }),
                        }}
                        onSelect={onSelectCategory}
                      />

                      {categoryError && (
                        <FormError>
                          <Trans>Category is required</Trans>
                        </FormError>
                      )}
                    </View>
                  )}
                </View>
              )}

              {!canDelete && (
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 12 }}>
                    <Trans>
                      You can also{' '}
                      <Link
                        variant="text"
                        onClick={() => {
                          setLoading(true);
                          dispatch(
                            closeAccount({
                              id: account.id,
                              forced: true,
                            }),
                          );
                          close();
                        }}
                        style={{ color: theme.errorText }}
                      >
                        force close
                      </Link>{' '}
                      the account which will delete it and all its transactions
                      permanently. Doing so may change your budget unexpectedly
                      since money in it may vanish.
                    </Trans>
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
                  <Trans>Cancel</Trans>
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{
                    height: isNarrowWidth ? styles.mobileMinHeight : undefined,
                  }}
                >
                  <Trans>Close Account</Trans>
                </Button>
              </View>
            </Form>
          </View>
        </>
      )}
    </Modal>
  );
}
