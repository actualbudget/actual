import React, { type ComponentPropsWithoutRef } from 'react';
import { mergeProps } from 'react-aria';
import { ListBoxItem } from 'react-aria-components';
import { useSelector } from 'react-redux';

import {
  PressResponder,
  usePress,
  useLongPress,
} from '@react-aria/interactions';

import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import { isPreviewId } from 'loot-core/src/shared/transactions';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { type TransactionEntity } from 'loot-core/types/models';

import { useAccount } from '../../../hooks/useAccount';
import { useCategories } from '../../../hooks/useCategories';
import { usePayee } from '../../../hooks/usePayee';
import { SvgSplit } from '../../../icons/v0';
import {
  SvgArrowsSynchronize,
  SvgCheckCircle1,
  SvgLockClosed,
} from '../../../icons/v2';
import { styles, theme } from '../../../style';
import { makeAmountFullStyle } from '../../budget/util';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';
import { TextOneLine } from '../../common/TextOneLine';
import { View } from '../../common/View';

import { lookupName, getDescriptionPretty, Status } from './TransactionEdit';

const ROW_HEIGHT = 60;

type TransactionListItemProps = ComponentPropsWithoutRef<
  typeof ListBoxItem<TransactionEntity>
> & {
  isNewTransaction: (transaction: TransactionEntity['id']) => boolean;
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
  const account = useAccount(transaction?.account || '');
  const transferAcct = useAccount(payee?.transfer_acct || '');
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
    amount: originalAmount,
    category: categoryId,
    cleared: isCleared,
    reconciled: isReconciled,
    is_parent: isParent,
    is_child: isChild,
    schedule,
  } = transaction;

  const isAdded = newTransactions.includes(id);

  let amount = originalAmount;
  if (isPreview) {
    amount = getScheduledAmount(amount);
  }

  const categoryName = lookupName(categories, categoryId);

  const prettyDescription = getDescriptionPretty(
    transaction,
    payee,
    transferAcct,
  );
  const specialCategory = account?.offbudget
    ? 'Off Budget'
    : transferAcct && !transferAcct.offbudget
      ? 'Transfer'
      : isParent
        ? 'Split'
        : null;

  const prettyCategory = specialCategory || categoryName;

  const textStyle = isPreview
    ? {
        fontStyle: 'italic',
        color: theme.pageTextLight,
      }
    : {};

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
                padding: '0 10px',
              }}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {schedule && (
                    <SvgArrowsSynchronize
                      style={{
                        width: 12,
                        height: 12,
                        marginRight: 5,
                        color: textStyle.color || theme.menuItemText,
                      }}
                    />
                  )}
                  <TextOneLine
                    style={{
                      ...styles.text,
                      ...textStyle,
                      fontSize: 14,
                      fontWeight: isAdded ? '600' : '400',
                      ...(prettyDescription === '' && {
                        color: theme.tableTextLight,
                        fontStyle: 'italic',
                      }),
                    }}
                  >
                    {prettyDescription || 'Empty'}
                  </TextOneLine>
                </View>
                {isPreview ? (
                  <Status status={categoryId} isSplit={isParent || isChild} />
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
              </View>
              <View style={{ justifyContent: 'center' }}>
                <Text
                  style={{
                    ...styles.text,
                    ...textStyle,
                    marginLeft: 25,
                    marginRight: 5,
                    fontSize: 14,
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
