import React, {
  type CSSProperties,
  type ComponentPropsWithoutRef,
} from 'react';
import { mergeProps } from 'react-aria';
import { ListBoxItem } from 'react-aria-components';

import {
  PressResponder,
  usePress,
  useLongPress,
} from '@react-aria/interactions';

import { useCachedSchedules } from 'loot-core/client/data-hooks/schedules';
import { isPreviewId } from 'loot-core/src/shared/transactions';
import { integerToCurrency } from 'loot-core/src/shared/util';
import {
  type AccountEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useAccount } from '../../../hooks/useAccount';
import { useCategories } from '../../../hooks/useCategories';
import { useDisplayPayee } from '../../../hooks/useDisplayPayee';
import { usePayee } from '../../../hooks/usePayee';
import { SvgLeftArrow2, SvgRightArrow2, SvgSplit } from '../../../icons/v0';
import {
  SvgArrowsSynchronize,
  SvgCalendar,
  SvgCheckCircle1,
  SvgLockClosed,
} from '../../../icons/v2';
import { useSelector } from '../../../redux';
import { styles, theme } from '../../../style';
import { makeAmountFullStyle } from '../../budget/util';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';
import { TextOneLine } from '../../common/TextOneLine';
import { View } from '../../common/View';

import { lookupName, Status } from './TransactionEdit';

const ROW_HEIGHT = 60;

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

type TransactionListItemProps = ComponentPropsWithoutRef<
  typeof ListBoxItem<TransactionEntity>
> & {
  onPress: (transaction: TransactionEntity) => void;
  onLongPress: (transaction: TransactionEntity) => void;
};

export function TransactionListItem({
  onPress,
  onLongPress,
  ...props
}: TransactionListItemProps) {
  const { list: categories } = useCategories();

  const { value: transaction } = props;

  const payee = usePayee(transaction?.payee || '');
  const displayPayee = useDisplayPayee({ transaction });

  const account = useAccount(transaction?.account || '');
  const transferAccount = useAccount(payee?.transfer_acct || '');
  const isPreview = isPreviewId(transaction?.id || '');

  const newTransactions = useSelector(state => state.queries.newTransactions);

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
    ? 'Off budget'
    : transferAccount && !transferAccount.offbudget
      ? 'Transfer'
      : isParent
        ? 'Split'
        : null;

  const prettyCategory = specialCategory || categoryName;
  const textStyle = getTextStyle({ isPreview });

  return (
    <ListBoxItem textValue={id} {...props}>
      {({ isSelected }) => (
        <PressResponder {...mergeProps(pressProps, longPressProps)}>
          <Button
            style={{
              userSelect: 'none',
              height: ROW_HEIGHT,
              width: '100%',
              borderRadius: 0,
              ...(isSelected
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
                      ...(!displayPayee && {
                        fontStyle: 'italic',
                      }),
                    }}
                  >
                    {displayPayee || '(No payee)'}
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
                      {prettyCategory || 'Uncategorized'}
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
                    {notes}
                  </TextOneLine>
                )}
              </View>
              <View style={{ justifyContent: 'center' }}>
                <Text
                  style={{
                    ...textStyle,
                    ...makeAmountFullStyle(amount),
                  }}
                >
                  {integerToCurrency(amount)}
                </Text>
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
          <SvgCalendar style={getScheduleIconStyle({ isPreview })} />
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
