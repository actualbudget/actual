import React, {
  type CSSProperties,
  type ComponentPropsWithoutRef,
} from 'react';
import { mergeProps } from 'react-aria';
import { ListBoxItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgLeftArrow2,
  SvgRightArrow2,
  SvgSplit,
} from '@actual-app/components/icons/v0';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
  SvgCheckCircle1,
  SvgLockClosed,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  PressResponder,
  usePress,
  useLongPress,
} from '@react-aria/interactions';

import { isPreviewId } from 'loot-core/shared/transactions';
import { type IntegerAmount, integerToCurrency } from 'loot-core/shared/util';
import {
  type AccountEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { lookupName, Status } from './TransactionEdit';

import {
  makeAmountFullStyle,
  makeBalanceAmountStyle,
} from '@desktop-client/components/budget/util';
import { useAccount } from '@desktop-client/hooks/useAccount';
import { useCachedSchedules } from '@desktop-client/hooks/useCachedSchedules';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDisplayPayee } from '@desktop-client/hooks/useDisplayPayee';
import { usePayee } from '@desktop-client/hooks/usePayee';
import { NotesTagFormatter } from '@desktop-client/notes/NotesTagFormatter';
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

type TransactionListItemProps = Omit<
  ComponentPropsWithoutRef<typeof ListBoxItem<TransactionEntity>>,
  'onPress'
> & {
  showRunningBalance?: boolean;
  runningBalance?: IntegerAmount;
  onPress: (transaction: TransactionEntity) => void;
  onLongPress: (transaction: TransactionEntity) => void;
};

export function TransactionListItem({
  showRunningBalance,
  runningBalance,
  onPress,
  onLongPress,
  ...props
}: TransactionListItemProps) {
  const { t } = useTranslation();
  const { list: categories } = useCategories();

  const { value: transaction } = props;

  const payee = usePayee(transaction?.payee || '');
  const displayPayee = useDisplayPayee({ transaction });

  const account = useAccount(transaction?.account || '');
  const transferAccount = useAccount(payee?.transfer_acct || '');
  const isPreview = isPreviewId(transaction?.id || '');

  const newTransactions = useSelector(
    state => state.transactions.newTransactions,
  );

  const { longPressProps } = useLongPress({
    accessibilityDescription: 'Long press to select multiple transactions',
    onLongPress: () => {
      if (isPreview) {
        return;
      }

      onLongPress(transaction!);
    },
  });

  const { pressProps } = usePress({
    onPress: () => {
      onPress(transaction!);
    },
  });

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
    <ListBoxItem textValue={id} {...props}>
      {itemProps => (
        <PressResponder {...mergeProps(pressProps, longPressProps)}>
          <Button
            {...itemProps}
            style={{
              userSelect: 'none',
              height: ROW_HEIGHT,
              width: '100%',
              borderRadius: 0,
              ...(itemProps.isSelected
                ? {
                    borderWidth: '0 0 0 4px',
                    borderColor: theme.mobileTransactionSelected,
                    borderStyle: 'solid',
                  }
                : {
                    borderWidth: '0 0 1px 0',
                    borderColor: theme.tableBorder,
                    borderStyle: 'solid',
                  }),
              ...(isPreview
                ? {
                    backgroundColor: theme.tableRowHeaderBackground,
                  }
                : {
                    backgroundColor: theme.tableBackground,
                  }),
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <PayeeIcons
                    transaction={transaction}
                    transferAccount={transferAccount}
                  />
                  <TextOneLine
                    style={{
                      ...textStyle,
                      fontWeight: isAdded ? '600' : '400',
                      ...(!displayPayee && !isPreview
                        ? {
                            color: theme.pageTextLight,
                            fontStyle: 'italic',
                          }
                        : {}),
                    }}
                  >
                    {displayPayee || t('(No payee)')}
                  </TextOneLine>
                </View>
                {isPreview ? (
                  <Status
                    status={previewStatus}
                    isSplit={isParent || isChild}
                  />
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 3,
                    }}
                  >
                    {isReconciled ? (
                      <SvgLockClosed
                        style={{
                          width: 11,
                          height: 11,
                          color: theme.noticeTextLight,
                          marginRight: 5,
                        }}
                      />
                    ) : (
                      <SvgCheckCircle1
                        style={{
                          width: 11,
                          height: 11,
                          color: isCleared
                            ? theme.noticeTextLight
                            : theme.pageTextSubdued,
                          marginRight: 5,
                        }}
                      />
                    )}
                    {(isParent || isChild) && (
                      <SvgSplit
                        style={{
                          width: 12,
                          height: 12,
                          marginRight: 5,
                        }}
                      />
                    )}
                    <TextOneLine
                      style={{
                        fontSize: 11,
                        marginTop: 1,
                        fontWeight: '400',
                        color: prettyCategory
                          ? theme.tableText
                          : theme.menuItemTextSelected,
                        fontStyle:
                          specialCategory || !prettyCategory
                            ? 'italic'
                            : undefined,
                        textAlign: 'left',
                      }}
                    >
                      {prettyCategory || t('Uncategorized')}
                    </TextOneLine>
                  </View>
                )}
                {notes && (
                  <TextOneLine
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      fontWeight: '400',
                      color: theme.tableText,
                      textAlign: 'left',
                      opacity: 0.85,
                    }}
                  >
                    <NotesTagFormatter notes={notes} />
                  </TextOneLine>
                )}
              </View>
              <View
                style={{ justifyContent: 'center', alignItems: 'flex-end' }}
              >
                <Text
                  style={{
                    ...textStyle,
                    ...makeAmountFullStyle(amount),
                  }}
                >
                  {integerToCurrency(amount)}
                </Text>
                {showRunningBalance && runningBalance !== undefined && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '400',
                      ...makeBalanceAmountStyle(runningBalance),
                    }}
                  >
                    {integerToCurrency(runningBalance)}
                  </Text>
                )}
              </View>
            </View>
          </Button>
        </PressResponder>
      )}
    </ListBoxItem>
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
    schedule &&
    schedule._date &&
    typeof schedule._date === 'object' &&
    !!schedule._date.frequency;

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
