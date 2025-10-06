import React, {
  type CSSProperties,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';

import { isPreviewId } from 'loot-core/shared/transactions';
import {
  type AccountEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { lookupName } from './TransactionEdit';
import { TransactionContent } from './TransactionContent';

import { ActionableListBoxItem } from '@desktop-client/components/mobile/ActionableListBoxItem';
import { useAccount } from '@desktop-client/hooks/useAccount';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDisplayPayee } from '@desktop-client/hooks/useDisplayPayee';
import { usePayee } from '@desktop-client/hooks/usePayee';
import { useSelector } from '@desktop-client/redux';

export const ROW_HEIGHT = 60;

const getTextStyle = ({
  isPreview,
}: {
  isPreview: boolean;
}): CSSProperties => ({
  ...styles.text,
  fontSize: 14,
  ...(isPreview
    ? {
        fontStyle: 'italic',
        color: theme.pageTextLight,
      }
    : {}),
});

const getScheduleIconStyle = ({ isPreview }: { isPreview: boolean }) => ({
  width: 12,
  height: 12,
  marginRight: 5,
  color: isPreview ? theme.pageTextLight : theme.menuItemText,
});

type TransactionListItemProps = {
  value: TransactionEntity;
  onPress: (transaction: TransactionEntity) => void;
  onLongPress: (transaction: TransactionEntity) => void;
  onDelete?: (transaction: TransactionEntity) => void;
};

export function TransactionListItem({
  value: transaction,
  onPress,
  onLongPress,
  onDelete,
}: TransactionListItemProps) {
  const { t } = useTranslation();
  const { list: categories } = useCategories();

  const payee = usePayee(transaction?.payee || '');
  const displayPayee = useDisplayPayee({ transaction });

  const account = useAccount(transaction?.account || '');
  const transferAccount = useAccount(payee?.transfer_acct || '');
  const isPreview = isPreviewId(transaction?.id || '');

  const newTransactions = useSelector(
    state => state.transactions.newTransactions,
  );

  if (!transaction) {
    return null;
  }

  const {
    id,
    amount,
    category: categoryId,
    cleared: isCleared,
    reconciled: isReconciled,
    is_parent: isParent,
    is_child: isChild,
    notes,
    forceUpcoming,
  } = transaction;

  const previewStatus = forceUpcoming ? 'upcoming' : categoryId;

  const isAdded = newTransactions.includes(id);
  const categoryName = lookupName(categories, categoryId);
  const specialCategory = account?.offbudget
    ? t('Off budget')
    : transferAccount && !transferAccount.offbudget
      ? t('Transfer')
      : isParent
        ? t('Split')
        : null;

  const prettyCategory = specialCategory || categoryName;
  const textStyle = getTextStyle({ isPreview });

  return (
    <ActionableListBoxItem
      value={transaction}
      textValue={id}
      actions={
        onDelete && !isPreview ? (
          <Button
            variant="bare"
            onPress={() => onDelete(transaction)}
            style={{
              color: theme.errorText,
              width: '100%',
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        ) : undefined
      }
      onAction={() => onPress(transaction)}
    >
      <TransactionContent
        transaction={transaction}
        transferAccount={transferAccount}
        textStyle={textStyle}
        isAdded={isAdded}
        displayPayee={displayPayee}
        isPreview={isPreview}
        previewStatus={previewStatus}
        isParent={isParent}
        isChild={isChild}
        isReconciled={isReconciled}
        isCleared={isCleared}
        prettyCategory={prettyCategory}
        specialCategory={specialCategory}
        notes={notes}
        amount={amount}
      />
    </ActionableListBoxItem>
  );
}

type PayeeIconsProps = {
  transaction: TransactionEntity;
  transferAccount?: AccountEntity;
};

function PayeeIcons({ transaction, transferAccount }: PayeeIconsProps) {
  const { id, schedule: scheduleId } = transaction;
  const { isLoading: isSchedulesLoading, schedules = [] } =
    useCachedSchedules();
  const isPreview = isPreviewId(id);
  const schedule = schedules.find(s => s.id === scheduleId);
  const isScheduleRecurring =
    schedule && schedule._date && !!schedule._date.frequency;

  if (isSchedulesLoading) {
    return null;
  }

  return (
    <>
      {schedule &&
        (isScheduleRecurring ? (
          <SvgArrowsSynchronize style={getScheduleIconStyle({ isPreview })} />
        ) : (
          <SvgCalendar3 style={getScheduleIconStyle({ isPreview })} />
        ))}
      {transferAccount &&
        (transaction.amount > 0 ? (
          <SvgLeftArrow2 style={{ width: 12, height: 12, marginRight: 5 }} />
        ) : (
          <SvgRightArrow2 style={{ width: 12, height: 12, marginRight: 5 }} />
        ))}
    </>
  );
}
