import { useState } from 'react';
import type { FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { FormError } from '@actual-app/components/form-error';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Paragraph } from '@actual-app/components/paragraph';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { integerToCurrency } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { useCloseAccountMutation } from '#accounts';
import { AccountAutocomplete } from '#components/autocomplete/AccountAutocomplete';
import { CategoryAutocomplete } from '#components/autocomplete/CategoryAutocomplete';
import { Link } from '#components/common/Link';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetActions } from '#components/mobile/MobileSheetActions';
import { MobileSheetCategoryPicker } from '#components/mobile/MobileSheetCategoryPicker';
import { MobileSheetPickerField } from '#components/mobile/MobileSheetPickerField';
import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

function needsCategory(
  account: AccountEntity,
  currentTransfer: string,
  accounts: AccountEntity[],
) {
  const transferTarget = accounts.find(a => a.id === currentTransfer);
  return account.offbudget === 0 && transferTarget?.offbudget === 1;
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
  const { t } = useTranslation();
  const { data: allAccounts = [] } = useAccounts();
  const accounts = allAccounts.filter(a => a.closed === 0);
  const {
    data: { grouped: categoryGroups, list: categories } = {
      grouped: [],
      list: [],
    },
  } = useCategories();
  const [isClosing, setIsClosing] = useState(false);
  const [transferAccountId, setTransferAccountId] = useState('');
  const transferAccount = accounts.find(a => a.id === transferAccountId);
  const [categoryId, setCategoryId] = useState('');
  const category = categories.find(c => c.id === categoryId);
  const [hasTransferError, setHasTransferError] = useState(false);
  const [hasCategoryError, setHasCategoryError] = useState(false);
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const closeAccount = useCloseAccountMutation();

  const onSelectAccount = (accountId: string | null) => {
    setTransferAccountId(accountId ?? '');
    if (accountId) {
      setHasTransferError(false);
    }
  };

  const onSelectCategory = (selectedCategoryId: string | null) => {
    setCategoryId(selectedCategoryId ?? '');
    if (selectedCategoryId) {
      setHasCategoryError(false);
    }
  };

  const submit = () => {
    const transferMissing = balance !== 0 && !transferAccountId;
    const categoryMissing =
      needsCategory(account, transferAccountId, accounts) && !categoryId;
    setHasTransferError(transferMissing);
    setHasCategoryError(categoryMissing);
    if (transferMissing || categoryMissing) {
      return false;
    }
    setIsClosing(true);
    closeAccount.mutate({
      id: account.id,
      transferAccountId: transferAccountId || undefined,
      categoryId: categoryId || undefined,
    });
    return true;
  };

  const forceClose = (close: () => void) => {
    setIsClosing(true);
    closeAccount.mutate({ id: account.id, forced: true });
    close();
  };

  const intro = (
    <Paragraph>
      <Trans>
        Are you sure you want to close{' '}
        <strong>{{ accountName: account.name } as TransObjectLiteral}</strong>
        ?{' '}
      </Trans>
      {canDelete ? (
        <Trans>
          This account has no transactions so it will be permanently deleted.
        </Trans>
      ) : (
        <Trans>
          This account has transactions so we can't permanently delete it.
        </Trans>
      )}
    </Paragraph>
  );

  const balanceIntro = (
    <Paragraph>
      <Trans>
        This account has a balance of{' '}
        <strong>
          {{ balance: integerToCurrency(balance) } as TransObjectLiteral}
        </strong>
        . To close this account, select a different account to transfer this
        balance to:
      </Trans>
    </Paragraph>
  );

  const categoryIntro = (
    <Paragraph>
      <Trans>
        Since you are transferring the balance from an on budget account to an
        off budget account, this transaction must be categorized. Select a
        category:
      </Trans>
    </Paragraph>
  );

  const renderForceClose = (close: () => void) =>
    !canDelete && (
      <View style={{ marginBottom: spacing.lg }}>
        <Text size="small">
          <Trans>
            You can also{' '}
            <Link
              variant="text"
              onClick={() => forceClose(close)}
              style={{ color: theme.errorText }}
            >
              force close
            </Link>{' '}
            the account which will delete it and all its transactions
            permanently. Doing so may change your budget unexpectedly since
            money in it may vanish.
          </Trans>
        </Text>
      </View>
    );

  if (isNarrowWidth) {
    return (
      <MobileSheet
        name="close-account"
        title={t('Close Account')}
        isLoading={isClosing}
      >
        {({ close }) => (
          <View style={{ padding: `0 ${spacing.lg}px` }}>
            {intro}
            {balance !== 0 && (
              <View>
                {balanceIntro}
                <View style={{ marginBottom: spacing.lg }}>
                  <MobileSheetPickerField
                    label={t('Account')}
                    placeholder={t('Select account...')}
                    valueName={transferAccount?.name}
                    onPress={() =>
                      dispatch(
                        pushModal({
                          modal: {
                            name: 'account-autocomplete',
                            options: {
                              includeClosedAccounts: false,
                              hiddenAccounts: [account.id],
                              onSelect: onSelectAccount,
                            },
                          },
                        }),
                      )
                    }
                  />
                </View>
                {hasTransferError && (
                  <FormError style={{ marginBottom: spacing.lg }}>
                    <Trans>Transfer is required</Trans>
                  </FormError>
                )}
                {needsCategory(account, transferAccountId, accounts) && (
                  <View style={{ marginBottom: spacing.lg }}>
                    {categoryIntro}
                    <MobileSheetCategoryPicker
                      categoryGroups={categoryGroups}
                      valueName={category?.name}
                      onSelect={onSelectCategory}
                    />
                    {hasCategoryError && (
                      <FormError>
                        <Trans>Category is required</Trans>
                      </FormError>
                    )}
                  </View>
                )}
              </View>
            )}
            {renderForceClose(close)}
            <MobileSheetActions
              onCancel={close}
              confirmLabel={t('Close Account')}
              onConfirm={() => {
                if (submit()) {
                  close();
                }
              }}
            />
          </View>
        )}
      </MobileSheet>
    );
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>, close: () => void) => {
    event.preventDefault();
    if (submit()) {
      close();
    }
  };

  return (
    <Modal
      name="close-account"
      isLoading={isClosing}
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Close Account')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View>
            {intro}
            <Form onSubmit={event => onSubmit(event, () => state.close())}>
              {balance !== 0 && (
                <View>
                  {balanceIntro}
                  <View style={{ marginBottom: spacing.lg }}>
                    <AccountAutocomplete
                      includeClosedAccounts={false}
                      hiddenAccounts={[account.id]}
                      value={transferAccountId}
                      inputProps={{
                        placeholder: t('Select account...'),
                        autoFocus: true,
                      }}
                      onSelect={onSelectAccount}
                    />
                  </View>
                  {hasTransferError && (
                    <FormError style={{ marginBottom: spacing.lg }}>
                      <Trans>Transfer is required</Trans>
                    </FormError>
                  )}
                  {needsCategory(account, transferAccountId, accounts) && (
                    <View style={{ marginBottom: spacing.lg }}>
                      {categoryIntro}
                      <CategoryAutocomplete
                        categoryGroups={categoryGroups}
                        value={categoryId}
                        inputProps={{ placeholder: t('Select category...') }}
                        onSelect={onSelectCategory}
                      />
                      {hasCategoryError && (
                        <FormError>
                          <Trans>Category is required</Trans>
                        </FormError>
                      )}
                    </View>
                  )}
                </View>
              )}
              {renderForceClose(() => state.close())}
              <View
                style={{ flexDirection: 'row', justifyContent: 'flex-end' }}
              >
                <Button
                  style={{ marginRight: spacing.md }}
                  onPress={() => state.close()}
                >
                  <Trans>Cancel</Trans>
                </Button>
                <Button type="submit" variant="primary">
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
