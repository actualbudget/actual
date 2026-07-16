import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  amountToInteger,
  integerToAmount,
  tsToRelativeTime,
} from '@actual-app/core/shared/util';
import { format as formatDate } from 'date-fns';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { FinancialText } from '#components/FinancialText';
import { FieldLabel } from '#components/mobile/MobileForms';
import { AmountInput } from '#components/mobile/transactions/AmountInput';
import { useAccount } from '#hooks/useAccount';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Modal as ModalType } from '#modals/modalsSlice';
import * as bindings from '#spreadsheet/bindings';

type AccountReconcileModalProps = Extract<
  ModalType,
  { name: 'account-reconcile' }
>['options'];

export function AccountReconcileModal({
  accountId,
  onReconcile,
}: AccountReconcileModalProps) {
  const { t } = useTranslation();
  const account = useAccount(accountId);
  const mobileCalculatorEnabled = useFeatureFlag('mobileCalculator');
  const clearedBalance = useSheetValue<'account', 'balanceCleared'>(
    bindings.accountBalanceCleared(accountId),
  );
  const format = useFormat();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const locale = useLocale();

  const [amount, setAmount] = useState<number | null>(null);
  const [amountInputKey, setAmountInputKey] = useState(0);

  useEffect(() => {
    if (amount == null && clearedBalance != null) {
      setAmount(clearedBalance);
    }
  }, [amount, clearedBalance]);

  const lastSyncedBalance = account?.balance_current;

  if (!account) {
    return null;
  }

  const onSubmit = (newAmount: number | null) => {
    if (newAmount == null) {
      return;
    }
    onReconcile(newAmount);
  };

  return (
    <Modal
      name="account-reconcile"
      wrapperProps={{
        style: mobileCalculatorEnabled ? { paddingBottom: '30vh' } : undefined,
      }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Reconcile')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View>
            <FieldLabel
              title={t(
                'Enter the current balance of your bank account that you want to reconcile with:',
              )}
            />
            {amount != null && (
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <AmountInput
                  key={amountInputKey}
                  value={integerToAmount(amount)}
                  onChange={newAmount => setAmount(amountToInteger(newAmount))}
                  autoFocus
                  autoFocusDelay={150}
                  variant="large"
                />
              </View>
            )}
          </View>
          {lastSyncedBalance != null && (
            <View
              style={{
                alignItems: 'center',
                paddingTop: 10,
              }}
            >
              <Text>
                <Trans>Last Balance from Bank: </Trans>
                <FinancialText>
                  {format(lastSyncedBalance, 'financial')}
                </FinancialText>
              </Text>
              <Button
                style={{
                  height: styles.mobileMinHeight,
                  marginTop: 5,
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                }}
                onPress={() => {
                  setAmount(lastSyncedBalance);
                  setAmountInputKey(key => key + 1);
                }}
              >
                <Trans>Use last synced total</Trans>
              </Button>
            </View>
          )}
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              paddingTop: 10,
            }}
          >
            <Button
              variant="primary"
              isDisabled={amount == null}
              style={{
                height: styles.mobileMinHeight,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
              }}
              onPress={() => {
                onSubmit(amount);
                state.close();
              }}
            >
              <Trans>Reconcile</Trans>
            </Button>
          </View>
          <Text
            style={{
              color: theme.pageTextLight,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            {account.last_reconciled
              ? t('Reconciled {{ relativeTimeAgo }} ({{ absoluteDate }})', {
                  relativeTimeAgo: tsToRelativeTime(
                    account.last_reconciled,
                    locale,
                  ),
                  absoluteDate: formatDate(
                    new Date(parseInt(account.last_reconciled, 10)),
                    dateFormat,
                    { locale },
                  ),
                })
              : t('Not yet reconciled')}
          </Text>
        </>
      )}
    </Modal>
  );
}
